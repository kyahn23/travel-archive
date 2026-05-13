"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api/client";

/**
 * 로그인한 사용자 정보를 표현하는 인터페이스입니다.
 *
 * `interface` 는 객체의 필수 속성과 타입을 설명합니다.
 */
export interface AuthUser {
  id: number;
  email: string;
  nickname: string;
}

/**
 * 인증 상태를 묶은 인터페이스입니다.
 *
 * 함수 타입 속성(`login: (...) => Promise<void>`) 은
 * "이 속성은 함수여야 한다"는 뜻입니다.
 */
interface AuthState {
  user: AuthUser | null; // `| null` 은 아직 사용자 정보가 없을 수도 있음을 의미합니다.
  loading: boolean;
  login: (email: string, password: string) => Promise<void>; // 문자열 인자 2개를 받는 함수 타입입니다.
  signup: (email: string, password: string, nickname: string) => Promise<void>; // 가입 함수의 매개변수 타입을 명시합니다.
  logout: () => Promise<void>; // 인자가 없고 Promise 를 반환하는 함수입니다.
}

// `createContext<AuthState | null>(null)` 은 컨텍스트의 초기값이 없을 수 있으므로 null 을 허용합니다.
// `| null` 때문에, 컨텍스트를 꺼낼 때 null 체크가 필요합니다.
const AuthContext = createContext<AuthState | null>(null);

// 컴포넌트 props 타입을 인라인으로 작성했습니다.
// `{ children }: { children: ReactNode }` 는 props 객체에서 children 만 꺼내고,
// 그 children 이 React가 렌더링 가능한 모든 타입임을 의미합니다.
export function AuthProvider({ children }: { children: ReactNode }) {
  // `useState<AuthUser | null>(null)` 은 상태가 사용자 객체이거나 null 일 수 있음을 뜻합니다.
  const [user, setUser] = useState<AuthUser | null>(null);
  // boolean 상태는 타입 주석 없이도 추론되지만, 의미를 이해하기 쉽게 볼 수 있습니다.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<AuthUser>("/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // `useCallback` 은 함수를 메모이제이션합니다.
  // 매개변수 타입을 명시해 JavaScript의 암묵적 타입 추측 대신 안전성을 확보합니다.
  const login = useCallback(async (email: string, password: string) => {
    await api.post("/auth/login", { email, password });
    const me = await api.get<AuthUser>("/auth/me");
    setUser(me.data);
  }, []);

  const signup = useCallback(
    async (email: string, password: string, nickname: string) => {
      await api.post("/auth/signup", { email, password, nickname });
      // Auto-login after signup
      await api.post("/auth/login", { email, password });
      const me = await api.get<AuthUser>("/auth/me");
      setUser(me.data);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// 커스텀 훅의 반환 타입을 명시해, 사용처에서 어떤 값이 오는지 분명하게 합니다.
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
