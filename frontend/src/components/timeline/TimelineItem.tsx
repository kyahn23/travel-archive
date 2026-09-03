"use client";

import { useState } from "react";
import { MapPin, Clock, Trash2, Edit3, Loader2, Camera } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// 문자열 리터럴 유니언 타입입니다. 일반 string이 아니라, 아래 5개 값만 허용합니다.
export type TimelineCategory = "PLACE" | "FOOD" | "ACTIVITY" | "MOVE" | "MEMO";

/**
 * 사진 1장의 데이터 타입입니다.
 *
 * fileUrl: string | null 처럼 "문자열 또는 null"을 허용하는 이유는
 * 아직 서버 URL이 없을 수도 있기 때문입니다.
 */
export interface PhotoData {
  id: number;
  storageKey: string;
  fileUrl: string | null;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  caption: string | null;
  sortOrder: number;
}

/**
 * 타임라인 항목 1개의 전체 데이터 구조입니다.
 *
 * photos: PhotoData[] 는 "사진 객체가 여러 개 들어있는 배열"이라는 뜻입니다.
 */
export interface TimelineItemData {
  id: number;
  tripDayId: number;
  tripDay: number;
  travelDate: string;
  visitedAt: string | null;
  title: string;
  placeName: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  category: TimelineCategory;
  memo: string | null;
  photos: PhotoData[];
}

/**
 * 같은 날짜에 속한 타임라인 항목들을 묶은 그룹 타입입니다.
 */
export interface DayGroup {
  tripDayId: number;
  tripDay: number;
  travelDate: string;
  items: TimelineItemData[];
}

// Record<K, V>는 "키 K마다 값 V를 반드시 가진 객체"를 뜻합니다.
const CATEGORY_LABEL: Record<TimelineCategory, string> = {
  PLACE: "장소",
  FOOD: "음식",
  ACTIVITY: "활동",
  MOVE: "이동",
  MEMO: "메모",
};

// variant 값도 허용 가능한 문자열만 제한해서 잘못된 UI 스타일 이름을 막습니다.
const CATEGORY_VARIANT: Record<TimelineCategory, "default" | "secondary" | "outline" | "soft" | "tealSoft" | "muted"> = {
  PLACE: "tealSoft",
  FOOD: "soft",
  ACTIVITY: "secondary",
  MOVE: "muted",
  MEMO: "outline",
};

// string | null 은 "문자열이거나 값이 없을 수 있음"을 뜻합니다.
function formatTime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

/**
 * TimelineItem 컴포넌트의 props 타입입니다.
 * onDelete는 서버 호출을 기다리는 비동기 함수이므로 Promise<void>입니다.
 */
interface TimelineItemProps {
  item: TimelineItemData;
  onEdit: (item: TimelineItemData) => void;
  onDelete: (id: number) => Promise<void>;
  onUploadPhoto: (itemId: number) => void;
}

/**
 * 타임라인 한 항목을 화면에 표시하고, 편집/삭제/사진 업로드 버튼을 제공하는 컴포넌트입니다.
 */
export function TimelineItem({ item, onEdit, onDelete, onUploadPhoto }: TimelineItemProps) {
  const [deleting, setDeleting] = useState(false); // boolean 상태입니다.

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete(item.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="group relative flex gap-3 pb-5">
      <div className="flex flex-col items-center">
        <div className="h-2.5 w-2.5 rounded-full bg-coral-500 mt-1.5 shrink-0" />
        <div className="w-px flex-1 bg-border" />
      </div>

      <div className="flex-1 min-w-0 -mt-0.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {item.visitedAt && (
              <span className="flex items-center gap-1 text-caption text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatTime(item.visitedAt)}
              </span>
            )}
            <Badge variant={CATEGORY_VARIANT[item.category]}>
              {CATEGORY_LABEL[item.category]}
            </Badge>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label={`${item.title} 사진 업로드`}
              onClick={() => onUploadPhoto(item.id)}
            >
              <Camera className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label={`${item.title} 편집`}
              onClick={() => onEdit(item)}
            >
              <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label={`${item.title} 삭제`}
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>

        <h4 className="text-body font-medium mt-1">{item.title}</h4>

        {item.placeName && (
          <div className="flex items-center gap-1 text-caption text-muted-foreground mt-0.5">
            <MapPin className="h-3 w-3" />
            <span>{item.placeName}</span>
            {item.address && <span>· {item.address}</span>}
          </div>
        )}

        {item.memo && (
          <p className="text-caption text-muted-foreground mt-1">{item.memo}</p>
        )}

        {item.photos.length > 0 && (
          <div className="flex gap-2 mt-2">
            {item.photos.map((photo) => (
              <div
                key={photo.id}
                className="h-14 w-14 rounded-lg bg-muted overflow-hidden shrink-0"
              >
                {/* Authenticated file responses are not compatible with Next image optimization. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/files/${photo.id}`}
                  alt={photo.originalFileName}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
