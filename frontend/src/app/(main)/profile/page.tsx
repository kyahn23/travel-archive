"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { useRequireAuth } from "@/lib/auth/hooks";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, User, Mail, Info } from "lucide-react";

/**
 * 마이페이지 화면 컴포넌트입니다.
 *
 * 이 함수는 일반 JavaScript 함수처럼 보이지만, Next.js App Router에서
 * 페이지 컴포넌트로 사용되며 TypeScript로 작성되어 있습니다.
 * 여기서는 별도의 props가 없어서 함수 매개변수가 비어 있습니다.
 */
export default function ProfilePage() {
  const { loading: authLoading } = useRequireAuth();
  const { user, logout } = useAuth();
  const router = useRouter();

  if (authLoading || !user) return null;

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="마이페이지" description="내 계정 정보를 확인합니다" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-4.5 w-4.5 text-coral-500" />
            계정 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-coral-100">
              <span className="text-title font-bold text-coral-600">
                {user.nickname.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-body-lg font-semibold">{user.nickname}</span>
              <span className="text-caption text-muted-foreground">{user.email}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-lg bg-muted/50 p-4">
            <div className="flex items-center gap-2.5">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-caption text-muted-foreground">닉네임</span>
              <span className="text-body ml-auto">{user.nickname}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-caption text-muted-foreground">이메일</span>
              <span className="text-body ml-auto">{user.email}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-4.5 w-4.5 text-teal-500" />
            앱 정보
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-body text-muted-foreground">버전</span>
              <span className="text-body">1.0.0</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-body text-muted-foreground">빌드</span>
              <span className="text-body">MVP</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button
        variant="outline"
        className="w-full gap-2 text-destructive hover:bg-destructive/5 hover:text-destructive"
        onClick={handleLogout}
      >
        <LogOut className="h-4 w-4" />
        로그아웃
      </Button>
    </div>
  );
}
