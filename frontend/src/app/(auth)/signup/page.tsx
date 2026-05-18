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
 * 회원가입 페이지 컴포넌트입니다.
 *
 * TypeScript 설명:
 * - `useState("")` / `useState(false)` 처럼 초기값으로 타입을 추론하게 합니다.
 * - `FormEvent` 는 폼 제출 이벤트 타입이고, `preventDefault()` 호출을 위해 사용합니다.
 * - 입력값 검증은 JavaScript 로직이지만, 상태 타입은 TypeScript가 안전하게 추론합니다.
 */
export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();

  // 이메일 문자열 상태입니다. 초기값이 빈 문자열이라 TypeScript는 string으로 추론합니다.
  const [email, setEmail] = useState("");
  // 닉네임 문자열 상태입니다.
  const [nickname, setNickname] = useState("");
  // 비밀번호 문자열 상태입니다.
  const [password, setPassword] = useState("");
  // 비밀번호 확인 문자열 상태입니다.
  const [confirmPassword, setConfirmPassword] = useState("");
  // 에러 메시지 문자열 상태입니다.
  const [error, setError] = useState("");
  // 요청 진행 중 여부를 나타내는 boolean 상태입니다.
  const [pending, setPending] = useState(false);

  // `FormEvent` 타입을 붙여서 form 제출 이벤트라는 점을 명확히 합니다.
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("이메일을 입력해주세요.");
      return;
    }
    if (!nickname.trim()) {
      setError("닉네임을 입력해주세요.");
      return;
    }
    if (nickname.trim().length > 20) {
      setError("닉네임은 20자 이하로 입력해주세요.");
      return;
    }
    if (!password) {
      setError("비밀번호를 입력해주세요.");
      return;
    }
    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setPending(true);
    try {
      await signup(email.trim(), password, nickname.trim());
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409 || err.body.includes("duplicate") || err.body.includes("already")) {
          setError("이미 사용 중인 이메일입니다.");
        } else {
          setError(err.body);
        }
      } else {
        setError("회원가입 중 오류가 발생했습니다.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-display text-coral-600">Travel Archive</CardTitle>
        <CardDescription className="text-body">새 계정을 만들어 시작하세요</CardDescription>
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
              // 입력 이벤트 객체의 `target.value`는 현재 입력된 이메일 문자열입니다.
              onChange={(e) => setEmail(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="nickname" className="text-caption font-medium text-foreground">
              닉네임
            </label>
            <Input
              id="nickname"
              type="text"
              placeholder="여행자"
              autoComplete="nickname"
              value={nickname}
              // `ChangeEvent`를 직접 쓰지 않았지만, `e`는 입력 변경 이벤트 객체입니다.
              onChange={(e) => setNickname(e.target.value)}
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
              placeholder="8자 이상"
              autoComplete="new-password"
              value={password}
              // 비밀번호 입력값을 문자열로 읽어 상태를 갱신합니다.
              onChange={(e) => setPassword(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirmPassword" className="text-caption font-medium text-foreground">
              비밀번호 확인
            </label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="비밀번호 재입력"
              autoComplete="new-password"
              value={confirmPassword}
              // 확인용 비밀번호도 동일하게 입력 이벤트에서 값을 꺼내 저장합니다.
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={pending}
            />
          </div>
          {error && (
            <p className="text-caption text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" size="lg" disabled={pending}>
            {pending ? "가입 중…" : "회원가입"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-caption text-muted-foreground">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="font-medium text-coral-500 hover:text-coral-600">
            로그인
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
