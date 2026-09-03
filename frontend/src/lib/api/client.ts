/**
 * API Client — thin wrapper around fetch for the Travel Archive backend.
 *
 * - All requests go to `/api/*` which Next.js rewrites to the backend.
 * - Cookies (httpOnly) are sent automatically via `credentials: "include"`.
 * - CSRF: unsafe requests bootstrap a missing XSRF-TOKEN cookie once, then
 *   echo it as the X-XSRF-TOKEN header.
 * - 401 from a protected request triggers a single shared refresh + CSRF
 *   re-bootstrap + single replay. Auth endpoints and `/api/auth/csrf`
 *   itself are excluded from the refresh self-recursion.
 */

const CSRF_HEADER = "X-XSRF-TOKEN";
const CSRF_COOKIE = "XSRF-TOKEN";

export interface ApiResponse<T = unknown> {
  data: T;
  message: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`API ${status}: ${body}`);
    this.name = "ApiError";
  }
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const target = `${name}=`;
  for (const part of document.cookie.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(target)) {
      return decodeURIComponent(trimmed.substring(target.length));
    }
  }
  return null;
}

const REFRESH_PATH = "/auth/refresh";
const CSRF_PATH = "/auth/csrf";

type UnsafeMethod = "POST" | "PUT" | "PATCH" | "DELETE";

function isUnsafe(method?: string): method is UnsafeMethod {
  return method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
}

function skipsRefreshRetry(path: string): boolean {
  return path === REFRESH_PATH || path === CSRF_PATH || path === "/auth/login" || path === "/auth/signup" || path === "/auth/logout";
}

type BodyFactory = () => BodyInit | undefined;

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: BodyInit | unknown | null;
  bodyFactory?: BodyFactory;
  redirectOnUnauthorized?: boolean;
}

export class ApiClient {
  private baseUrl: string;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(baseUrl = "/api") {
    this.baseUrl = baseUrl;
  }

  async request<T>(
    path: string,
    options: RequestOptions = {},
    redirectOnUnauthorized = true,
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    const method = (options.method ?? "GET").toUpperCase();
    const unsafe = isUnsafe(method);
    const skipRefresh = skipsRefreshRetry(path);

    if (unsafe && !readCookie(CSRF_COOKIE)) {
      await this.bootstrapCsrf();
    }

    const finalOptions = await this.buildOptions(options, unsafe);
    let res = await fetch(url, finalOptions);

    if (res.status === 401 && !skipRefresh) {
      const refreshed = await this.singleRefresh();
      if (refreshed) {
        await this.bootstrapCsrf();
        const replay = await this.buildOptions(options, unsafe);
        res = await fetch(url, replay);
      }
      if (res.status === 401) {
        this.maybeRedirect(redirectOnUnauthorized);
        throw new ApiError(401, "Unauthorized");
      }
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "Unknown error");
      throw new ApiError(res.status, text);
    }

    if (res.status === 204 || res.headers.get("content-length") === "0") {
      return { data: undefined as unknown as T, message: "Success" };
    }

    return res.json() as Promise<ApiResponse<T>>;
  }

  private async buildOptions(
    options: RequestOptions,
    unsafe: boolean,
  ): Promise<RequestInit> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> | undefined),
    };
    const method = (options.method ?? "GET").toUpperCase();
    const isMultipart =
      typeof FormData !== "undefined" && options.body instanceof FormData;

    if (method !== "GET" && !isMultipart && headers["Content-Type"] == null) {
      headers["Content-Type"] = "application/json";
    }
    if (unsafe) {
      const token = readCookie(CSRF_COOKIE);
      if (token) headers[CSRF_HEADER] = token;
    }

    let body: BodyInit | undefined;
    if (options.bodyFactory) {
      body = options.bodyFactory() ?? undefined;
    } else if (options.body !== undefined && options.body !== null) {
      if (options.body instanceof FormData || typeof options.body === "string" || options.body instanceof Blob) {
        body = options.body as BodyInit;
      } else {
        body = JSON.stringify(options.body);
      }
    }

    return {
      method,
      headers,
      credentials: "include",
      body,
      ...Object.fromEntries(
        Object.entries(options).filter(
          ([k]) => !["headers", "method", "body", "bodyFactory", "credentials", "redirectOnUnauthorized"].includes(k),
        ),
      ),
    };
  }

  private async bootstrapCsrf(): Promise<void> {
    try {
      await fetch(`${this.baseUrl}${CSRF_PATH}`, {
        method: "GET",
        credentials: "include",
      });
    } catch {
      // missing cookie surfaces 403 to the caller
    }
  }

  private async singleRefresh(): Promise<boolean> {
    if (this.refreshPromise) return this.refreshPromise;
    this.refreshPromise = (async () => {
      try {
        if (!readCookie(CSRF_COOKIE)) await this.bootstrapCsrf();
        const csrfToken = readCookie(CSRF_COOKIE);
        const res = await fetch(`${this.baseUrl}${REFRESH_PATH}`, {
          method: "POST",
          credentials: "include",
          headers: csrfToken ? { [CSRF_HEADER]: csrfToken } : undefined,
        });
        return res.ok;
      } catch {
        return false;
      } finally {
        this.refreshPromise = null;
      }
    })();
    return this.refreshPromise;
  }

  private maybeRedirect(enabled: boolean): void {
    if (!enabled || typeof window === "undefined") return;
    const path = window.location.pathname;
    if (path.startsWith("/login") || path.startsWith("/signup")) return;
    // ApiClient is framework-agnostic and has no Next router context.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
  }

  get<T>(path: string, redirectOnUnauthorized = true) {
    return this.request<T>(path, { method: "GET" }, redirectOnUnauthorized);
  }

  post<T>(path: string, body?: unknown, redirectOnUnauthorized = true) {
    return this.request<T>(path, {
      method: "POST",
      body: body ?? undefined,
    }, redirectOnUnauthorized);
  }

  put<T>(path: string, body?: unknown, redirectOnUnauthorized = true) {
    return this.request<T>(path, {
      method: "PUT",
      body: body ?? undefined,
    }, redirectOnUnauthorized);
  }

  patch<T>(path: string, body?: unknown, redirectOnUnauthorized = true) {
    return this.request<T>(path, {
      method: "PATCH",
      body: body ?? undefined,
    }, redirectOnUnauthorized);
  }

  delete<T>(path: string, redirectOnUnauthorized = true) {
    return this.request<T>(path, { method: "DELETE" }, redirectOnUnauthorized);
  }

  upload<T>(path: string, formData: FormData, redirectOnUnauthorized = true) {
    return this.request<T>(
      path,
      {
        method: "POST",
        body: formData,
        bodyFactory: () => {
          const fresh = new FormData();
          formData.forEach((value, key) => {
            fresh.append(key, value as Blob | string);
          });
          return fresh;
        },
      },
      redirectOnUnauthorized,
    );
  }
}

export const api = new ApiClient();
