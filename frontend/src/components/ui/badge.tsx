import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * `cva`는 배지의 스타일 변형을 미리 정의하는 함수입니다.
 * `VariantProps<typeof badgeVariants>`는 `variant`에 허용되는 값들을 타입으로 추출합니다.
 * 이 타입도 실제 JS 실행에는 존재하지 않고 TypeScript 컴파일 단계에서만 사용됩니다.
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-coral-500 text-white",
        secondary: "border-transparent bg-teal-500 text-white",
        outline: "border-border text-foreground",
        soft: "border-transparent bg-coral-100 text-coral-600",
        tealSoft: "border-transparent bg-teal-100 text-teal-700",
        muted: "border-transparent bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

/**
 * 배지 컴포넌트가 받을 prop들의 형태를 정의합니다.
 * `React.HTMLAttributes<HTMLDivElement>`는 div의 표준 HTML 속성 전체를 허용합니다.
 */
export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

/**
 * 함수 매개변수에서 `({ className, variant, ...props }: BadgeProps)`처럼
 * 구조 분해와 타입 지정이 함께 쓰였습니다.
 * `...props`는 나머지 div 속성들을 모아 그대로 전달하는 rest parameter입니다.
 */
function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
