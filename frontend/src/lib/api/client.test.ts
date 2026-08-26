import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiError } from './client';

/**
 * ApiClient는 HTTP 요청 옵션과 응답 처리 규칙을 가지므로,
 * 이 테스트에서는 TypeScript의 타입 추론과 mock 타입 동작을 같이 확인합니다.
 *
 * TypeScript 문법 설명:
 * - 여기서 테스트 함수는 `async` 를 붙여 Promise 기반 비동기 코드를 다룹니다.
 * - `vi.mocked(fetch)` 는 `fetch` 를 "mock 함수로 취급하겠다"고 타입에 알려주는 헬퍼입니다.
 *   JavaScript에는 없는 타입 보정 문법이라고 보면 됩니다.
 */
describe('ApiClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    window.history.pushState({}, '', '/dashboard');
  });

  afterEach(() => {
    document.cookie = 'XSRF-TOKEN=; Max-Age=0; Path=/';
    vi.unstubAllGlobals();
  });

  it('bootstraps CSRF and sends its header for login', async () => {
    vi.mocked(fetch)
      .mockImplementationOnce(async () => {
        document.cookie = 'XSRF-TOKEN=csrf-token; Path=/';
        return new Response(JSON.stringify({ data: {}, message: 'Success' }), { status: 200 });
      })
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: {}, message: 'Success' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    await new ApiClient('/api').post('/auth/login', {
      email: 'traveler@example.com',
      password: 'password123',
    });

    expect(fetch).toHaveBeenNthCalledWith(1, '/api/auth/csrf', expect.objectContaining({ method: 'GET' }));
    expect(fetch).toHaveBeenNthCalledWith(2, '/api/auth/login', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ 'X-XSRF-TOKEN': 'csrf-token' }),
    }));
  });

  it('sends cookies with requests', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ data: { id: 1 }, message: 'OK' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await new ApiClient('/api').get('/trips');

    // `expect.objectContaining(...)` 는 객체의 일부 속성만 맞는지 검사하는 matcher 입니다.
    // TypeScript 문법은 아니지만, 아래 요청 옵션 객체가 정확히 어떤 값이어야 하는지 읽기 쉽게 보여 줍니다.
    expect(fetch).toHaveBeenCalledWith('/api/trips', expect.objectContaining({
      method: 'GET',
      credentials: 'include',
    }));
  });

  it('returns the backend response envelope', async () => {
    const envelope = { data: [{ title: 'Busan' }], message: 'Success' };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(envelope), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(new ApiClient('/api').get('/trips')).resolves.toEqual(envelope);
  });

  it('redirects unauthenticated users to login', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('Unauthorized', { status: 401 }));
    vi.stubGlobal('window', {
      location: {
        pathname: '/dashboard',
        href: '',
      },
    });

    await expect(new ApiClient('/api').get('/me')).rejects.toBeInstanceOf(ApiError);

    expect(window.location.href).toBe('/login');
  });

  it('throws on 401 without redirect when disabled', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('Unauthorized', { status: 401 }));
    window.history.pushState({}, '', '/dashboard');
    const before = window.location.href;

    await expect(new ApiClient('/api').get('/me', false)).rejects.toBeInstanceOf(ApiError);

    expect(window.location.href).toBe(before);
  });
});
