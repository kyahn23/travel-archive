"use client";

import { useState } from "react";
import { Check, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 체크리스트 한 줄(item)의 서버/클라이언트 공통 데이터 구조입니다.
 *
 * JS에서는 "그냥 객체"이지만, TS에서는 status가 TODO/DONE 중 하나라고
 * 정확히 제한해서 실수를 줄입니다.
 */
export interface ChecklistItemData {
  id: number;
  category: string;
  content: string;
  status: "TODO" | "DONE";
  sortOrder: number;
  dueDate: string | null;
}

/**
 * ChecklistItem 컴포넌트가 받는 props 타입입니다.
 * onToggle/onDelete는 호출 후 서버 작업을 기다려야 하므로 Promise<void>로 선언합니다.
 */
interface ChecklistItemProps {
  item: ChecklistItemData;
  onToggle: (id: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

/**
 * 체크/삭제 버튼이 붙은 단일 체크리스트 항목 컴포넌트입니다.
 */
export function ChecklistItem({ item, onToggle, onDelete }: ChecklistItemProps) {
  const [toggling, setToggling] = useState(false); // boolean 상태: 클릭 중인지 표시합니다.
  const [deleting, setDeleting] = useState(false); // boolean 상태: 삭제 요청 중인지 표시합니다.

  const done = item.status === "DONE";

  async function handleToggle() {
    setToggling(true);
    try {
      await onToggle(item.id);
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete(item.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="group flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-cream-100 transition-colors">
      <button
        type="button"
        onClick={handleToggle}
        disabled={toggling}
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
          done
            ? "border-teal-500 bg-teal-500 text-white"
            : "border-border hover:border-coral-400"
        )}
      >
        {toggling ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          done && <Check className="h-3 w-3" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <span
          className={cn(
            "text-body transition-colors",
            done && "line-through text-muted-foreground"
          )}
        >
          {item.content}
        </span>
      </div>

      {item.category && (
        <span className="shrink-0 rounded-full bg-cream-200 px-2 py-0.5 text-micro text-muted-foreground">
          {item.category}
        </span>
      )}

      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="shrink-0 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
      >
        {deleting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}
