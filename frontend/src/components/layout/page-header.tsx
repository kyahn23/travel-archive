import { cn } from "@/lib/utils";

/**
 * PageHeader 컴포넌트에 전달되는 props의 타입 정의입니다.
 * TypeScript의 interface는 "이 객체에는 어떤 속성이 있어야 하는지"를
 * 미리 선언해서, JavaScript의 느슨한 객체 전달 방식보다 더 안전하게 만듭니다.
 */
interface PageHeaderProps {
  title: string; // 문자열만 허용하는 필수 속성입니다.
  description?: string; // ?는 이 값이 없어도 된다는 뜻입니다. 있으면 문자열이어야 합니다.
  action?: React.ReactNode; // React.ReactNode는 JSX, 문자열, 숫자 등 화면에 렌더링 가능한 값을 뜻합니다.
  className?: string; // 선택적으로 추가 CSS 클래스를 넘길 수 있습니다.
}

export function PageHeader(
  { title, description, action, className }: PageHeaderProps // 매개변수 객체 전체의 타입을 PageHeaderProps로 지정합니다.
) {
  return (
    <header className={cn("flex items-start justify-between gap-4", className)}>
      <div className="space-y-1">
        <h1 className="text-display-lg font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-body text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </header>
  );
}
