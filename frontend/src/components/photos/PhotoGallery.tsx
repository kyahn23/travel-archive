"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api/client";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Loader2, RotateCcw, Download } from "lucide-react";
import type { DayGroup, PhotoData } from "@/components/timeline/TimelineItem";

/**
 * PhotoGallery가 받는 props 타입입니다.
 */
interface PhotoGalleryProps {
  tripId: number;
}

/**
 * 갤러리에서 사진 1개를 보여주기 위해 묶은 편의용 타입입니다.
 */
interface PhotoEntry {
  photo: PhotoData;
  itemTitle: string;
  itemDate: string;
  itemId: number;
}

// iso: string 타입은 날짜 문자열을 의미합니다.
function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}

/**
 * 여행의 모든 사진을 모아서 그리드/모달로 보여주는 컴포넌트입니다.
 */
export function PhotoGallery({ tripId }: PhotoGalleryProps) {
  const [photos, setPhotos] = useState<PhotoEntry[]>([]); // PhotoEntry 배열 상태입니다.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoEntry | null>(null); // 선택된 사진이 없을 수도 있으므로 null을 허용합니다.

  // useCallback으로 fetchPhotos 함수를 메모이즈합니다.
  const fetchPhotos = useCallback(async () => {
    try {
      const res = await api.get<DayGroup[]>(`/trips/${tripId}/timeline`);
      const entries: PhotoEntry[] = [];
      for (const group of res.data) {
        for (const item of group.items) {
          for (const photo of item.photos) {
            entries.push({
              photo,
              itemTitle: item.title,
              itemDate: group.travelDate,
              itemId: item.id,
            });
          }
        }
      }
      setPhotos(entries);
    } catch {
      setError("사진을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

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
        <Button variant="outline" size="sm" className="mt-3" onClick={fetchPhotos}>
          <RotateCcw className="mr-1 h-3.5 w-3.5" />
          다시 시도
        </Button>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <EmptyState
        icon={<ImageIcon className="h-8 w-8 text-muted-foreground" />}
        title="사진이 없습니다"
        description="타임라인 항목에 사진을 추가하면 여기에 표시됩니다."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {photos.map((entry) => (
          <button
            key={entry.photo.id}
            onClick={() => setSelectedPhoto(entry)}
            className="group relative aspect-square rounded-xl overflow-hidden bg-muted"
          >
            <img
              src={`/api/files/${entry.photo.id}`}
              alt={entry.photo.originalFileName}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-caption text-white truncate">{entry.itemTitle}</p>
              <p className="text-micro text-white/70">{formatDate(entry.itemDate)}</p>
            </div>
          </button>
        ))}
      </div>

      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative max-h-[85vh] max-w-3xl w-full rounded-xl overflow-hidden bg-card"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={`/api/files/${selectedPhoto.photo.id}`}
              alt={selectedPhoto.photo.originalFileName}
              className="h-full w-full object-contain max-h-[70vh]"
            />
            <div className="flex items-center justify-between p-3 border-t">
              <div>
                <p className="text-body font-medium">{selectedPhoto.itemTitle}</p>
                <p className="text-caption text-muted-foreground">
                  {formatDate(selectedPhoto.itemDate)} · {selectedPhoto.photo.originalFileName}
                </p>
              </div>
              <a
                href={`/api/files/${selectedPhoto.photo.id}`}
                download
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm">
                  <Download className="mr-1 h-3.5 w-3.5" />
                  다운로드
                </Button>
              </a>
            </div>
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-3 right-3 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
