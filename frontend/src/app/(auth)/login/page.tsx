"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

/**
 * 로그인 페이지 컴포넌트입니다.
 *
 * TypeScript 설명:
 * - `useState("")` 는 빈 문자열을 초기값으로 주기 때문에,
 *   TypeScript가 상태 타입을 자동으로 `string`으로 추론합니다.
 * - 즉 여기서는 `useState<string>("")` 를 따로 쓰지 않았지만,
 *   같은 의미로 문자열 상태를 만드는 것입니다.
 * - `FormEvent` 는 `form` 제출 이벤트의 타입입니다.
 *   JavaScript에서는 그냥 `e`라고 쓰지만, TypeScript에서는
 *   `e`가 어떤 이벤트 객체인지 알려줘야 `preventDefault()` 같은 메서드를
 *   안전하게 사용할 수 있습니다.
 */
export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  // 초기값이 문자열이므로 TypeScript가 `string` 상태로 추론합니다.
  const [email, setEmail] = useState("");
  // 비밀번호도 문자열 상태입니다.
  const [password, setPassword] = useState("");
  // 에러 메시지도 문자열 상태입니다.
  const [error, setError] = useState("");
  // 로딩 중 여부를 나타내는 boolean 상태입니다.
  const [pending, setPending] = useState(false);

  // `e: FormEvent` 는 이 함수가 form 제출 이벤트 핸들러임을 명시합니다.
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("이메일을 입력해주세요.");
      return;
    }
    if (!password) {
      setError("비밀번호를 입력해주세요.");
      return;
    }

    setPending(true);
    try {
      await login(email.trim(), password);
      router.replace("/");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.status === 401 ? "이메일 또는 비밀번호가 일치하지 않습니다." : err.body);
      } else {
        setError("로그인 중 오류가 발생했습니다.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-display text-coral-600">Travel Archive</CardTitle>
        <CardDescription className="text-body">여행 기록을 시작하세요</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-caption font-medium text-foreground">
              이메일
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              // `e`는 입력 이벤트 객체입니다. `target.value`로 현재 입력값을 읽어 상태를 갱신합니다.
              onChange={(e) => setEmail(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-caption font-medium text-foreground">
              비밀번호
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              // 마찬가지로 이벤트 객체에서 입력된 비밀번호 문자열을 꺼내 상태에 저장합니다.
              onChange={(e) => setPassword(e.target.value)}
              disabled={pending}
            />
          </div>
          {error && (
            <p className="text-caption text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" size="lg" disabled={pending}>
            {pending ? "로그인 중…" : "로그인"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-caption text-muted-foreground">
          계정이 없으신가요?{" "}
          <Link href="/signup" className="font-medium text-coral-500 hover:text-coral-600">
            회원가입
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
