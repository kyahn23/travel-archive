"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Map,
  Heart,
  BarChart3,
  User,
  Compass,
} from "lucide-react";
import { cn } from "@/lib/utils";

const sidebarItems = [
  { href: "/dashboard", label: "홈", icon: Home },
  { href: "/trips", label: "여행 기록", icon: Map },
  { href: "/bucket", label: "버킷리스트", icon: Heart },
  { href: "/stats", label: "통계", icon: BarChart3 },
  { href: "/profile", label: "마이페이지", icon: User },
] as const;
// as const는 배열의 각 값이 "변할 수 있는 일반 문자열/객체"가 아니라
// "읽기 전용의 더 구체적인 리터럴 타입"으로 추론되게 만드는 TypeScript 문법입니다.
// 예: href가 string 전체가 아니라 "/" 같은 정확한 값으로 보존됩니다.

export function Sidebar() {
  // `usePathname()`는 null일 수 있으므로 원본 값을 유지하고, 사용할 때만 기본값을 처리합니다.
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 md:left-0 border-r bg-white">
      <div className="flex h-16 items-center gap-2.5 px-6 border-b">
        <Compass className="h-7 w-7 text-coral-500" strokeWidth={2.2} />
        <span className="text-title font-bold tracking-tight">Travel Archive</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-1">
          {sidebarItems.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === "/dashboard" ? pathname === "/dashboard" || (pathname?.startsWith("/dashboard/") ?? false) : (pathname ?? "").startsWith(href);

            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-body transition-colors",
                    isActive
                      ? "bg-coral-50 text-coral-600 font-semibold"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t px-6 py-4">
        <p className="text-micro text-muted-foreground">Travel Archive v0.1</p>
      </div>
    </aside>
  );
}
