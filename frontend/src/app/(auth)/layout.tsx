/**
 * 인증(auth) 하위 페이지들을 감싸는 레이아웃입니다.
 *
 * TypeScript 설명:
 * - `{ children }: { children: React.ReactNode }` 는
 *   1) props 객체에서 `children`만 구조 분해하고,
 *   2) 그 props 전체의 타입이 `{ children: React.ReactNode }` 라고
 *      직접 명시하는 문법입니다.
 * - `React.ReactNode` 는 JSX 안에 넣을 수 있는 값 전체를 의미합니다.
 *   문자열, 숫자, JSX, 배열, `null` 등이 포함됩니다.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream-50 px-4 py-12">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
