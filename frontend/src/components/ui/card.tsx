import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * `React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>`는
 * ref를 실제 `<div>`에 연결하면서, 동시에 div가 받을 수 있는 표준 HTML 속성을
 * 모두 props로 허용하겠다는 뜻입니다.
 *
 * 여기의 제네릭 타입들은 컴파일 시에만 존재하며, 런타임 동작을 바꾸지 않습니다.
 */
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  /**
   * `({ className, ...props }, ref)`는 props 객체를 구조 분해하는 문법입니다.
   * `...props`는 나머지 속성들을 그대로 `<div>`에 넘기기 위한 rest parameter입니다.
   */
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-xl border bg-card text-card-foreground shadow-card", className)}
      {...props}
    />
  )
);
Card.displayName = "Card";

/**
 * 카드 헤더도 일반 div 속성을 그대로 받습니다.
 * `React.HTMLAttributes<HTMLDivElement>`는 div에 붙일 수 있는 className, onClick 같은
 * 속성들의 타입 묶음입니다.
 */
const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-1.5 p-5", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

/**
 * `React.HTMLAttributes<HTMLHeadingElement>`는 heading 요소에 대한 HTML 속성 타입입니다.
 * 아래는 `h3`를 렌더링하지만, 타입은 제목 계열 요소에 맞게 지정되어 있습니다.
 */
const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-title font-semibold leading-none tracking-tight", className)} {...props} />
  )
);
CardTitle.displayName = "CardTitle";

/**
 * 설명 텍스트 영역도 표준 paragraph 속성 타입을 사용합니다.
 */
const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-caption text-muted-foreground", className)} {...props} />
  )
);
CardDescription.displayName = "CardDescription";

/**
 * 본문 영역은 div 기반 레이아웃이므로 div 속성 타입을 그대로 받습니다.
 */
const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("px-5 pb-5", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

/**
 * 푸터도 동일하게 div 속성 타입을 사용합니다.
 */
const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center px-5 pb-5", className)} {...props} />
  )
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
