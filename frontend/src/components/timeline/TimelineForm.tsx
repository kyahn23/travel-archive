"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, X } from "lucide-react";
import type { TimelineCategory, TimelineItemData } from "./TimelineItem";

// Record<TimelineCategory, string>은 모든 카테고리 키가 빠짐없이 있어야 한다는 의미입니다.
const CATEGORY_LABEL: Record<TimelineCategory, string> = {
  PLACE: "장소",
  FOOD: "음식",
  ACTIVITY: "활동",
  MOVE: "이동",
  MEMO: "메모",
};

// TimelineCategory[] 는 "TimelineCategory 값만 들어가는 배열"입니다.
const CATEGORIES: TimelineCategory[] = ["PLACE", "FOOD", "ACTIVITY", "MOVE", "MEMO"];

/**
 * TimelineForm 컴포넌트가 받는 props 타입입니다.
 * initialData가 선택적(?)인 이유는 수정 모드가 아니라 새로 추가하는 모드도 있기 때문입니다.
 */
interface TimelineFormProps {
  travelDate: string;
  initialData?: TimelineItemData;
  onSubmit: (data: TimelineFormPayload) => Promise<void>;
  onCancel: () => void;
}

/**
 * 저장 API로 보낼 요청 본문 타입입니다.
 *
 * 일부 필드에 ? 가 붙은 것은 "있을 수도 있고 없을 수도 있다"는 뜻입니다.
 */
export interface TimelineFormPayload {
  title: string;
  place_name?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  visited_at?: string;
  category: TimelineCategory;
  memo?: string;
}

/**
 * 타임라인 항목을 새로 만들거나 수정하는 폼 컴포넌트입니다.
 */
export function TimelineForm({ travelDate, initialData, onSubmit, onCancel }: TimelineFormProps) {
  const [title, setTitle] = useState(initialData?.title ?? ""); // ?? 는 왼쪽 값이 null/undefined일 때만 오른쪽 기본값을 씁니다.
  const [placeName, setPlaceName] = useState(initialData?.placeName ?? "");
  const [address, setAddress] = useState(initialData?.address ?? "");
  const [visitedAt, setVisitedAt] = useState(() => {
    if (initialData?.visitedAt) {
      const d = new Date(initialData.visitedAt);
      return d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit", hour12: false });
    }
    return "";
  });
  const [category, setCategory] = useState<TimelineCategory>(initialData?.category ?? "PLACE"); // 제네릭 <TimelineCategory>로 상태값 범위를 제한합니다.
  const [memo, setMemo] = useState(initialData?.memo ?? "");
  const [latitude, setLatitude] = useState<string>(initialData?.latitude?.toString() ?? ""); // 숫자를 입력칸에 넣기 위해 string 상태로 보관합니다.
  const [longitude, setLongitude] = useState<string>(initialData?.longitude?.toString() ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // 매개변수 타입 string은 입력칸에서 받은 문자열을 의미합니다.
  function buildCoordinates(latStr: string, lngStr: string) {
    const lat = latStr.trim() === "" ? null : parseFloat(latStr);
    const lng = lngStr.trim() === "" ? null : parseFloat(lngStr);
    if (lat != null && (isNaN(lat) || lat < -90 || lat > 90)) return {};
    if (lng != null && (isNaN(lng) || lng < -180 || lng > 180)) return {};
    if (lat == null && lng == null) return {};
    return { latitude: lat, longitude: lng };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("제목을 입력하세요.");
      return;
    }

    setSubmitting(true);
    setError("");

    const payload: TimelineFormPayload = {
      title: title.trim(),
      category,
      ...(placeName.trim() && { place_name: placeName.trim() }),
      ...(address.trim() && { address: address.trim() }),
      ...(visitedAt && { visited_at: `${travelDate}T${visitedAt}:00` }),
      ...(memo.trim() && { memo: memo.trim() }),
      ...buildCoordinates(latitude, longitude),
    };

    try {
      await onSubmit(payload);
    } catch {
      setError("저장에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl bg-card border p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-title font-semibold">
          {initialData ? "타임라인 수정" : "새 타임라인 항목"}
        </h4>
        <button onClick={onCancel} className="rounded-md p-1 hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-caption font-medium text-muted-foreground mb-1 block">
            제목 *
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="방문한 곳이나 한 일"
            maxLength={100}
          />
        </div>

        <div>
          <label className="text-caption font-medium text-muted-foreground mb-1 block">
            카테고리
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`rounded-full px-3 py-1 text-caption font-medium transition-colors ${
                  category === cat
                    ? "bg-coral-500 text-white"
                    : "bg-muted text-muted-foreground hover:bg-cream-200"
                }`}
              >
                {CATEGORY_LABEL[cat]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-caption font-medium text-muted-foreground mb-1 block">
            시간
          </label>
          <Input
            type="time"
            value={visitedAt}
            onChange={(e) => setVisitedAt(e.target.value)}
          />
        </div>

        <div>
          <label className="text-caption font-medium text-muted-foreground mb-1 block">
            장소명
          </label>
          <Input
            value={placeName}
            onChange={(e) => setPlaceName(e.target.value)}
            placeholder="장소 이름"
            maxLength={100}
          />
        </div>

        <div>
          <label className="text-caption font-medium text-muted-foreground mb-1 block">
            주소
          </label>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="주소"
            maxLength={200}
          />
        </div>

        <div>
          <label className="text-caption font-medium text-muted-foreground mb-1 block">
            메모
          </label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="간단한 메모"
            maxLength={500}
            rows={2}
            className="flex w-full rounded-lg border border-input bg-background px-4 py-2 text-body ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-caption font-medium text-muted-foreground mb-1 block">
              위도
            </label>
            <Input
              type="number"
              step="any"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="-90 ~ 90"
            />
          </div>
          <div>
            <label className="text-caption font-medium text-muted-foreground mb-1 block">
              경도
            </label>
            <Input
              type="number"
              step="any"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="-180 ~ 180"
            />
          </div>
        </div>

        {error && <p className="text-caption text-destructive">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            취소
          </Button>
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
            {initialData ? "수정" : "추가"}
          </Button>
        </div>
      </form>
    </div>
  );
}
