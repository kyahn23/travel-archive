import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * `cva(...)`는 여러 CSS 클래스 조합을 타입 안전하게 만들어 주는 도구입니다.
 * 여기서 반환된 `buttonVariants`는 버튼의 `variant`와 `size` 값을 기준으로
 * 적절한 className 문자열을 만들어 줍니다.
 *
 * 참고: 이 값은 런타임에도 사용되지만, 아래 `VariantProps<typeof buttonVariants>`
 * 같은 타입은 컴파일 시점에만 존재하는 TypeScript 타입 정보입니다.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-coral-500 text-white hover:bg-coral-600 active:bg-coral-700",
        secondary: "bg-teal-500 text-white hover:bg-teal-600 active:bg-teal-700",
        outline: "border border-border bg-background hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        destructive: "bg-destructive text-destructive-foreground hover:bg-red-600",
        link: "text-coral-500 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-touch px-5 rounded-lg text-body",
        sm: "h-9 px-3 rounded-md text-caption",
        lg: "h-12 px-8 rounded-xl text-body-lg",
        icon: "h-10 w-10 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

/**
 * `interface`는 객체의 모양을 정의합니다.
 * `extends React.ButtonHTMLAttributes<HTMLButtonElement>`는
 * 일반 HTML `<button>`이 받을 수 있는 속성들을 모두 포함하겠다는 뜻입니다.
 *
 * `React.ButtonHTMLAttributes<HTMLButtonElement>`는 제네릭 타입입니다.
 * `HTMLButtonElement`는 "이 props가 버튼 요소에 적용된다"는 의미를 타입으로 적는 것입니다.
 *
 * `VariantProps<typeof buttonVariants>`는 위에서 만든 `buttonVariants`가 허용하는
 * `variant`, `size` 같은 선택값을 타입으로 추출합니다.
 * `typeof buttonVariants`의 `typeof`는 "값"을 타입 자리에서 참조하기 위한 문법입니다.
 */
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * `?`가 붙은 prop은 선택적(optional)입니다.
   * 즉, `asChild`를 넘기지 않아도 되고 기본값을 사용할 수 있습니다.
   */
  asChild?: boolean;
}

/**
 * `React.forwardRef<...>`는 ref를 자식 DOM 요소까지 전달하기 위한 React 유틸리티입니다.
 *
 * `<HTMLButtonElement, ButtonProps>`는 제네릭 인자 두 개를 넣은 것입니다.
 * - 첫 번째 타입: ref가 최종적으로 가리키는 DOM 요소 타입
 * - 두 번째 타입: 이 컴포넌트가 받는 props 타입
 *
 * 이 타입 정보도 컴파일 시에만 존재하고, 실제 JS 런타임 코드로 남지는 않습니다.
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  /**
   * props 구조 분해에서 각 이름의 타입은 `ButtonProps`로 이미 정해져 있습니다.
   * `...props`는 나머지 HTML 속성들을 한 번에 모아 전달하는 rest parameter입니다.
   */
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    /**
     * `asChild`가 true면 실제 버튼 대신 Radix `Slot`을 렌더링합니다.
     * 아니면 기본 HTML `button`을 렌더링합니다.
     */
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
