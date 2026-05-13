"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Map,
  Heart,
  BarChart3,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "홈", icon: Home },
  { href: "/trips", label: "여행", icon: Map },
  { href: "/bucket", label: "버킷", icon: Heart },
  { href: "/stats", label: "통계", icon: BarChart3 },
  { href: "/profile", label: "마이", icon: User },
] as const;
// as const는 아래 배열의 각 항목을 변경 불가능한 값으로 취급하고,
// href/label을 더 정확한 리터럴 타입으로 유지하게 해 줍니다.

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-white/90 backdrop-blur-md safe-area-bottom md:hidden">
      <ul className="flex h-16 items-center justify-around px-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname?.startsWith(href) ?? false;

          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex min-w-touch flex-col items-center justify-center gap-0.5 rounded-lg text-micro transition-colors",
                  isActive
                    ? "text-coral-500"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                <span className={cn(isActive && "font-semibold")}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
