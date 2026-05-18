import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './context';
import { ApiError, api } from '@/lib/api/client';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');

  return {
    ...actual,
    api: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
  };
});

function AuthProbe() {
  const { user, loading } = useAuth();

  return (
    <div>
      <div data-testid="user">{user ? user.email : 'null'}</div>
      <div data-testid="loading">{loading ? 'true' : 'false'}</div>
    </div>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/dashboard');
    vi.mocked(api.get).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('loads without redirecting on initial unauthorized me request', async () => {
    vi.mocked(api.get).mockImplementation(
      async (path: string, redirectOnUnauthorized?: boolean) => {
        if (path === '/auth/me' && redirectOnUnauthorized === false) {
          throw new ApiError(401, 'Unauthorized');
        }

        throw new Error(`Unexpected call: ${path}`);
      },
    );

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('user')).toHaveTextContent('null');
    expect(window.location.href).not.toContain('/login');
  });
});
