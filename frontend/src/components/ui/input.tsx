import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * `interface`로 input props의 타입을 선언합니다.
 * `extends React.InputHTMLAttributes<HTMLInputElement>`는
 * HTML `<input>`이 기본적으로 받을 수 있는 속성들(예: placeholder, onChange, disabled)을
 * 전부 허용하겠다는 의미입니다.
 *
 * `<HTMLInputElement>`의 제네릭은 "이 속성들이 input 요소용"이라는 것을 명확히 합니다.
 * 이 타입 정보는 컴파일 시에만 존재합니다.
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

/**
 * `forwardRef<HTMLInputElement, InputProps>`는 ref가 실제 input DOM을 가리키도록 해 줍니다.
 * 두 번째 제네릭 `InputProps`는 이 컴포넌트가 받는 props의 형태를 정의합니다.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  /**
   * 구조 분해한 `type`, `className`, `...props`는 모두 `InputProps` 기준으로 타입 체크됩니다.
   * `...props`는 나머지 input 속성을 그대로 전달하기 위한 rest parameter입니다.
   */
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-touch w-full rounded-lg border border-input bg-background px-4 py-2 text-body ring-offset-background file:border-0 file:bg-transparent file:text-body file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
