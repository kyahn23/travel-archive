/**
 * API Client — thin wrapper around fetch for the Travel Archive backend.
 *
 * - All requests go to `/api/*` which Next.js rewrites to the backend.
 * - Cookies (httpOnly) are sent automatically via `credentials: "include"`.
 * - 401 responses redirect to `/login`.
 */

/** Standard backend envelope */
// `ApiResponse<T>` 는 제네릭 인터페이스입니다.
// `T` 는 "아직 정해지지 않은 응답 데이터 타입" 자리표시자입니다.
// 그래서 같은 응답 포맷을 유지하면서 데이터 타입만 재사용할 수 있습니다.
export interface ApiResponse<T = unknown> {
  data: T; // 응답 본문 데이터 타입은 호출 시점에 결정됩니다.
  message: string; // 서버 메시지는 항상 문자열입니다.
}

export class ApiError extends Error {
  constructor(
    public status: number, // `public` 은 생성자 매개변수를 클래스 프로퍼티로 자동 선언합니다.
    public body: string, // 매개변수와 필드 선언을 동시에 하는 TypeScript 문법입니다.
  ) {
    super(`API ${status}: ${body}`);
    this.name = "ApiError";
  }
}

// `class` 에서도 타입 주석, 제네릭, 접근 제한자(public/private)를 함께 사용할 수 있습니다.
export class ApiClient {
  private baseUrl: string; // `private` 는 클래스 내부에서만 접근 가능하다는 뜻입니다.

  constructor(baseUrl = "/api") {
    this.baseUrl = baseUrl; // 생성자 매개변수에는 타입을 생략했지만 기본값으로 문자열이 됩니다.
  }

  /** Low-level request — throws ApiError on non-2xx. */
  async request<T>(
    path: string, // `: string` 은 경로가 문자열이어야 함을 명시합니다.
    options: RequestInit = {}, // `RequestInit` 은 fetch 옵션 객체의 표준 타입입니다.
    redirectOnUnauthorized = true,
  ): Promise<ApiResponse<T>> {
    // `Promise<ApiResponse<T>>` 는 비동기 작업이 끝나면 `ApiResponse<T>` 를 반환한다는 뜻입니다.
    // 여기서도 `T` 는 호출할 때 결정되는 제네릭 타입입니다.
    const url = `${this.baseUrl}${path}`;
    // `Record<string, string>` 은 "문자열 키와 문자열 값"을 갖는 객체 타입입니다.
    // 헤더 객체처럼 동적으로 key/value 를 담는 구조에 자주 사용합니다.
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      // `as Record<string, string> | undefined` 는 타입 단언(type assertion)입니다.
      // `options.headers` 가 표준 `HeadersInit` 의 다양한 형태를 가질 수 있어서,
      // 여기서는 간단히 문자열 객체로 취급하겠다고 TypeScript에 알려줍니다.
      ...(options.headers as Record<string, string> | undefined),
    };

    const res = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });

    if (res.status === 401) {
      // Don't redirect if already on an auth page to avoid loops
      if (
        redirectOnUnauthorized &&
        typeof window !== "undefined" &&
        !window.location.pathname.startsWith("/login") &&
        !window.location.pathname.startsWith("/signup")
      ) {
        window.location.href = "/login";
      }
      throw new ApiError(401, "Unauthorized");
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "Unknown error");
      throw new ApiError(res.status, text);
    }

    if (res.status === 204 || res.headers.get("content-length") === "0") {
      // `as unknown as T` 는 "충분히 안전하다고 판단하는 임시 변환"입니다.
      // 먼저 `unknown` 으로 바꾼 뒤 `T` 로 다시 단언하여,
      // 빈 응답을 제네릭 결과 타입으로 맞춰 돌려줍니다.
      return { data: undefined as unknown as T, message: "Success" };
    }

    // `res.json()` 의 결과는 런타임에서 정확한 제네릭을 알 수 없으므로,
    // 반환값을 `Promise<ApiResponse<T>>` 로 단언해 사용합니다.
    return res.json() as Promise<ApiResponse<T>>;
  }

  // 제네릭 메서드는 호출하는 쪽이 원하는 데이터 타입을 넣을 수 있게 해줍니다.
  get<T>(path: string, redirectOnUnauthorized = true) {
    return this.request<T>(path, { method: "GET" }, redirectOnUnauthorized);
  }

  post<T>(path: string, body?: unknown, redirectOnUnauthorized = true) {
    return this.request<T>(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }, redirectOnUnauthorized);
  }

  put<T>(path: string, body?: unknown, redirectOnUnauthorized = true) {
    return this.request<T>(path, {
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }, redirectOnUnauthorized);
  }

  patch<T>(path: string, body?: unknown, redirectOnUnauthorized = true) {
    return this.request<T>(path, {
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }, redirectOnUnauthorized);
  }

  delete<T>(path: string, redirectOnUnauthorized = true) {
    return this.request<T>(path, { method: "DELETE" }, redirectOnUnauthorized);
  }
}

/** Singleton client for use across the app. */
export const api = new ApiClient();
