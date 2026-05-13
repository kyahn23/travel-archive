"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * 탭 상태를 컨텍스트로 공유하기 위한 타입입니다.
 * `interface`는 객체의 구조를 정의하며, 여기서는 현재 활성 탭과 그 값을 바꾸는 함수를 담습니다.
 *
 * `activeTab: string`의 `: string`은 "이 값은 문자열이어야 한다"는 타입 주석입니다.
 * 이런 타입 정보는 컴파일 시점에만 존재합니다.
 */
interface TabsContextValue {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

/**
 * `React.createContext<TabsContextValue | null>(null)`에서 `<...>`는 제네릭입니다.
 * 컨텍스트가 어떤 타입의 값을 전달할지 미리 선언합니다.
 *
 * `| null`은 "초기에는 값이 없을 수도 있다"는 뜻의 유니온 타입입니다.
 */
const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabs() {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("Tabs compound components must be used within <Tabs>");
  return ctx;
}

/**
 * `extends React.HTMLAttributes<HTMLDivElement>`는 Tabs 루트가 div 속성을
 * 기본적으로 모두 받도록 해 줍니다.
 *
 * `defaultValue: string`은 필수 prop이고, `value?: string`, `onValueChange?: ...`는
 * `?` 때문에 선택적 prop입니다.
 */
interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

/**
 * `({ defaultValue, value, onValueChange, className, children, ...props }: TabsProps)`처럼
 * props를 구조 분해하면서 동시에 타입을 적용합니다.
 * `children`은 React 자식 요소 타입이고, `...props`는 나머지 div 속성을 의미합니다.
 */
function Tabs({ defaultValue, value, onValueChange, className, children, ...props }: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const activeTab = value ?? internalValue;

  const setActiveTab = React.useCallback(
    (v: string) => {
      if (!value) setInternalValue(v);
      onValueChange?.(v);
    },
    [value, onValueChange]
  );

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={cn("w-full", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

/**
 * `React.HTMLAttributes<HTMLDivElement>`를 직접 매개변수 타입으로 사용했습니다.
 * 즉, 이 함수는 별도 props 인터페이스 없이 div 속성을 그대로 받습니다.
 */
function TabsList({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex h-11 items-center justify-start gap-1 rounded-lg bg-muted p-1",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * 버튼 탭 트리거의 prop 타입입니다.
 * `extends React.ButtonHTMLAttributes<HTMLButtonElement>`는 일반 button 속성을 모두 허용하고,
 * 추가로 `value: string`을 반드시 받도록 확장합니다.
 */
interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

/**
 * `value`, `className`, `children`, `...props`를 구조 분해하며 타입이 자동 적용됩니다.
 * `...props`는 버튼에 전달될 나머지 HTML 속성입니다.
 */
function TabsTrigger({ value, className, children, ...props }: TabsTriggerProps) {
  const { activeTab, setActiveTab } = useTabs();
  const isActive = activeTab === value;

  return (
    <button
      role="tab"
      type="button"
      aria-selected={isActive}
      data-state={isActive ? "active" : "inactive"}
      className={cn(
        "inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md px-4 text-caption font-medium transition-all",
        isActive
          ? "bg-background text-foreground shadow-soft"
          : "text-muted-foreground hover:text-foreground",
        className
      )}
      onClick={() => setActiveTab(value)}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * 각 탭 패널은 자신의 `value`와 현재 활성 탭을 비교해 표시 여부를 결정합니다.
 */
interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

/**
 * 패널도 div 속성 타입을 기본으로 받고, `value`는 추가 필수 prop입니다.
 */
function TabsContent({ value, className, children, ...props }: TabsContentProps) {
  const { activeTab } = useTabs();
  if (activeTab !== value) return null;

  return (
    <div
      role="tabpanel"
      data-state={activeTab === value ? "active" : "inactive"}
      className={cn("mt-3 animate-fade-in", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
