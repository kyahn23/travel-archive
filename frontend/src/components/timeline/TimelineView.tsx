"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api/client";
import { TimelineItem, DayGroup, TimelineItemData } from "./TimelineItem";
import { TimelineForm, TimelineFormPayload } from "./TimelineForm";
import { PhotoUploader } from "@/components/photos/PhotoUploader";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/layout/empty-state";
import { Clock, Loader2, Plus, RotateCcw } from "lucide-react";

/**
 * TimelineView가 부모로부터 받는 props 타입입니다.
 */
interface TimelineViewProps {
  tripId: number;
}

// iso: string 타입 주석은 "날짜 문자열"만 받는다는 뜻입니다.
function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

/**
 * 여행 일자별 타임라인 목록을 조회하고, 항목 생성/수정/삭제 및 사진 업로드 연결을 담당합니다.
 */
export function TimelineView({ tripId }: TimelineViewProps) {
  const [groups, setGroups] = useState<DayGroup[]>([]); // DayGroup[]: "일자별 그룹 배열" 타입입니다.
  const [loading, setLoading] = useState(true); // boolean 상태입니다.
  const [error, setError] = useState(""); // string 상태입니다.

  const [formTarget, setFormTarget] = useState<{
    dayDate: string;
    editItem?: TimelineItemData;
  } | null>(null); // 객체 또는 null 중 하나만 가질 수 있는 유니언 타입입니다.

  const [photoTarget, setPhotoTarget] = useState<number | null>(null); // 숫자 id 또는 선택 안 됨(null) 상태입니다.
  const fetchTimeline = useCallback(async () => {
    setError("");
    try {
      const res = await api.get<DayGroup[]>(`/trips/${tripId}/timeline`);
      setGroups(res.data);
    } catch {
      setError("타임라인을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  async function handleCreate(dayDate: string, payload: TimelineFormPayload) {
    await api.post(`/trips/${tripId}/timeline-items`, payload);
    setFormTarget(null);
    await fetchTimeline();
  }

  async function handleUpdate(item: TimelineItemData, payload: TimelineFormPayload) {
    await api.patch(`/timeline-items/${item.id}`, payload);
    setFormTarget(null);
    await fetchTimeline();
  }

  async function handleDelete(id: number) {
    await api.delete(`/timeline-items/${id}`);
    await fetchTimeline();
  }

  async function handlePhotoUploaded() {
    setPhotoTarget(null);
    await fetchTimeline();
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
        <Button variant="outline" size="sm" className="mt-3" onClick={fetchTimeline}>
          <RotateCcw className="mr-1 h-3.5 w-3.5" />
          다시 시도
        </Button>
      </div>
    );
  }

  const hasItems = groups.some((g) => g.items.length > 0);

  if (!hasItems && !formTarget) {
    return (
      <EmptyState
        icon={<Clock className="h-8 w-8 text-muted-foreground" />}
        title="타임라인이 비어 있습니다"
        description="일별 타임라인을 추가하여 여행을 기록하세요."
        action={
          groups.length > 0 ? (
            <Button size="sm" onClick={() => setFormTarget({ dayDate: groups[0].travelDate })}>
              <Plus className="mr-1 h-4 w-4" />
              타임라인 추가
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.tripDayId} className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-coral-500 text-white text-caption font-bold">
                {group.tripDay}
              </span>
              <span className="text-body font-medium">{formatDate(group.travelDate)}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-caption"
              onClick={() => setFormTarget({ dayDate: group.travelDate })}
            >
              <Plus className="mr-1 h-3 w-3" />
              추가
            </Button>
          </div>

          {formTarget?.dayDate === group.travelDate && (
            <TimelineForm
              travelDate={group.travelDate}
              initialData={formTarget.editItem}
              onSubmit={(payload) =>
                formTarget.editItem
                  ? handleUpdate(formTarget.editItem, payload)
                  : handleCreate(group.travelDate, payload)
              }
              onCancel={() => setFormTarget(null)}
            />
          )}

          {group.items.length > 0 && (
            <div className="pl-1">
              {group.items.map((item) => (
                <TimelineItem
                  key={item.id}
                  item={item}
                  onEdit={(i) => setFormTarget({ dayDate: group.travelDate, editItem: i })}
                  onDelete={handleDelete}
                  onUploadPhoto={(id) => setPhotoTarget(id)}
                />
              ))}
            </div>
          )}
        </div>
      ))}

      {photoTarget !== null && (
        <PhotoUploader
          timelineItemId={photoTarget}
          onUploaded={handlePhotoUploaded}
          onCancel={() => setPhotoTarget(null)}
        />
      )}
    </div>
  );
}
