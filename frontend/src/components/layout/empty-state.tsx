import { cn } from "@/lib/utils";
import { Inbox } from "lucide-react";

/**
 * EmptyState 컴포넌트의 props 타입입니다.
 * interface는 여러 속성을 하나의 "모양"으로 묶어 주는 TypeScript 문법입니다.
 * 자바스크립트만 알면 생소할 수 있지만, 결국 "이 컴포넌트가 받는 데이터 구조"를
 * 문서화하고 검사하는 역할이라고 생각하면 됩니다.
 */
interface EmptyStateProps {
  icon?: React.ReactNode; // ?가 있으므로 아이콘은 없어도 됩니다. React.ReactNode는 화면에 그릴 수 있는 모든 값입니다.
  title: string; // 반드시 문자열 제목이 필요합니다.
  description?: string; // 설명 문구는 선택 사항입니다.
  action?: React.ReactNode; // 버튼 같은 JSX 조각을 넘길 수 있습니다.
  className?: string; // 추가 스타일 클래스를 선택적으로 전달합니다.
}

export function EmptyState(
  { icon, title, description, action, className }: EmptyStateProps // props 객체의 전체 타입을 EmptyStateProps로 고정합니다.
) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-16 text-center",
        className
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        {icon ?? <Inbox className="h-8 w-8 text-muted-foreground" />}
      </div>
      <div className="space-y-1.5">
        <h3 className="text-title font-semibold">{title}</h3>
        {description && (
          <p className="max-w-xs text-body text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
