"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api/client";
import { ChecklistItem, ChecklistItemData } from "./ChecklistItem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/layout/empty-state";
import { CheckSquare, Loader2, Plus, RotateCcw } from "lucide-react";

// TypeScript 없이 보면 그냥 배열이지만, 여기서는 select 옵션 목록으로 쓰기 위해
// 각 항목의 value/label 구조를 고정한 "상수 배열"입니다.
const CHECKLIST_CATEGORIES = [
  { value: "PREPARATION", label: "준비" },
  { value: "PACKING", label: "짐싸기" },
  { value: "DOCUMENT", label: "서류" },
  { value: "BOOKING", label: "예약" },
  { value: "ETC", label: "기타" },
];

/**
 * 서버에서 체크리스트 API 응답으로 내려오는 객체 형태입니다.
 *
 * JavaScript만 알면 "이 객체는 반드시 id, tripId, title... 같은 속성을 가진다"는
 * 약속을 인터페이스로 명시한 것이라고 보면 됩니다.
 */
interface ChecklistResponse {
  id: number;
  tripId: number;
  title: string;
  progressRate: number;
  items: ChecklistItemData[];
}

/**
 * ChecklistView 컴포넌트가 부모로부터 받는 props 타입입니다.
 *
 * TypeScript에서는 컴포넌트가 어떤 값을 입력받는지 이런 식으로 미리 선언합니다.
 */
interface ChecklistViewProps {
  tripId: number;
}

/**
 * 체크리스트 전체를 보여주고, 생성/추가/삭제/완료 토글까지 담당하는 컴포넌트입니다.
 */
export function ChecklistView({ tripId }: ChecklistViewProps) {
  const [checklist, setChecklist] = useState<ChecklistResponse | null>(null); // null은 "아직 데이터가 없을 수 있음"을 뜻하는 유니언 타입입니다.
  const [loading, setLoading] = useState(true); // boolean 상태로, true/false 두 값만 가질 수 있습니다.
  const [error, setError] = useState(""); // 문자열 상태입니다. 초기값이 ""라서 TypeScript가 string으로 추론합니다.
  const [adding, setAdding] = useState(false); // 항목 추가 중인지 나타내는 boolean 상태입니다.
  const [newContent, setNewContent] = useState(""); // 새 항목 텍스트를 저장하는 string 상태입니다.
  const [newCategory, setNewCategory] = useState("ETC"); // 기본 카테고리 문자열입니다.

  // useCallback은 "함수를 다시 만들지 않도록 메모이즈"할 때 쓰는 React 훅입니다.
  // 뒤의 [tripId]는 이 값이 바뀔 때만 함수를 다시 생성하라는 의존성 배열입니다.
  const fetchChecklist = useCallback(async () => {
    setError("");
    try {
      const res = await api.get<ChecklistResponse>(`/trips/${tripId}/checklists`);
      setChecklist(res.data);
    } catch {
      setError("체크리스트를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  async function handleToggle(id: number) { // number 타입 주석은 "이 함수는 숫자 id만 받는다"는 뜻입니다.
    const res = await api.patch<ChecklistResponse>(`/checklist-items/${id}`);
    setChecklist(res.data);
  }

  async function handleDelete(id: number) { // Promise<void>를 반환하는 비동기 함수입니다.
    await api.delete(`/checklist-items/${id}`);
    await fetchChecklist();
  }

  async function handleCreate() {
    setLoading(true);
    try {
      const res = await api.post<ChecklistResponse>(`/trips/${tripId}/checklists`);
      setChecklist(res.data);
    } catch {
      setError("체크리스트 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddItem() {
    if (!checklist || !newContent.trim()) return;
    setAdding(true);
    try {
      await api.post(`/checklists/${checklist.id}/items`, {
        content: newContent.trim(),
        category: newCategory,
      });
      setNewContent("");
      await fetchChecklist();
    } catch {
      await fetchChecklist();
    } finally {
      setAdding(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-card border p-5 text-center">
        <p className="text-body text-destructive">{error}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={fetchChecklist}>
          <RotateCcw className="mr-1 h-3.5 w-3.5" />
          다시 시도
        </Button>
      </div>
    );
  }

  if (!checklist) {
    return (
      <EmptyState
        icon={<CheckSquare className="h-8 w-8 text-muted-foreground" />}
        title="체크리스트가 없습니다"
        description="체크리스트를 생성하여 여행 준비물을 관리하세요."
        action={
          <Button size="sm" onClick={handleCreate}>
            <Plus className="mr-1 h-4 w-4" />
            체크리스트 생성
          </Button>
        }
      />
    );
  }

  const total = checklist.items.length;
  const done = checklist.items.filter((i) => i.status === "DONE").length;
  const pct = checklist.progressRate;

  const grouped = checklist.items.reduce<Record<string, ChecklistItemData[]>>(
    (acc, item) => {
      const key = item.category || "기타";
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-card border p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-title font-semibold">{checklist.title}</h3>
          <span className="text-caption text-muted-foreground">
            {done}/{total} 완료
          </span>
        </div>

        <div className="h-2 w-full rounded-full bg-cream-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-teal-500 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-caption text-muted-foreground text-right">{pct}%</p>
      </div>

      {total === 0 ? (
        <EmptyState
          title="항목이 없습니다"
          description="여행 범위에 맞는 체크리스트가 생성됩니다."
        />
      ) : (
        Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="rounded-xl bg-card border p-4 space-y-1">
            <h4 className="text-caption font-semibold text-muted-foreground uppercase tracking-wider px-3 pb-2">
              {category}
            </h4>
            {items.map((item) => (
              <ChecklistItem
                key={item.id}
                item={item}
                onToggle={handleToggle}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ))
      )}

      <div className="rounded-xl bg-card border p-4 space-y-3">
        <h4 className="text-caption font-semibold text-muted-foreground uppercase tracking-wider px-1">
          항목 추가
        </h4>
        <div className="flex items-center gap-2">
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-2 text-caption focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {CHECKLIST_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
          <Input
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="항목 내용 입력"
            maxLength={300}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && newContent.trim()) {
                handleAddItem();
              }
            }}
          />
          <Button
            size="sm"
            onClick={handleAddItem}
            disabled={!newContent.trim() || adding}
          >
            {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
