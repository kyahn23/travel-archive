"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Upload, Loader2, AlertCircle } from "lucide-react";

// 파일 크기 제한은 바이트 단위 숫자 상수입니다.
const MAX_SIZE = 5 * 1024 * 1024;
// MIME type 문자열 배열로, 허용할 파일 형식을 제한합니다.
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

/**
 * 사진 업로더가 받는 props 타입입니다.
 */
interface PhotoUploaderProps {
  timelineItemId: number;
  onUploaded: () => void;
  onCancel: () => void;
}

/**
 * 타임라인 항목에 이미지를 첨부하는 업로드 컴포넌트입니다.
 */
export function PhotoUploader({ timelineItemId, onUploaded, onCancel }: PhotoUploaderProps) {
  const [file, setFile] = useState<File | null>(null); // File 타입은 브라우저가 제공하는 파일 객체입니다.
  const [preview, setPreview] = useState<string | null>(null); // 미리보기 URL 문자열 또는 없음(null) 상태입니다.
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null); // HTMLInputElement DOM 요소를 직접 참조할 때 사용합니다.

  // React.ChangeEvent<HTMLInputElement>는 "파일 입력창에서 발생한 change 이벤트" 타입입니다.
  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    if (!ACCEPTED.includes(f.type)) {
      setError("JPEG, PNG, WebP 형식만 가능합니다.");
      return;
    }
    if (f.size > MAX_SIZE) {
      setError("파일 크기는 5MB 이하여야 합니다.");
      return;
    }

    setError("");
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(f));
  }

  function clearFile() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  // preview가 바뀔 때마다 이전 object URL을 정리하는 효과입니다.
  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`/api/timeline-items/${timelineItemId}/photos`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "업로드 실패");
        throw new Error(text);
      }

      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-xl bg-card border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-title font-semibold">사진 업로드</h4>
        <button onClick={onCancel} className="rounded-md p-1 hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
      </div>

      {!file ? (
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-8 hover:border-coral-400 hover:bg-cream-50 transition-colors">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <span className="text-body text-muted-foreground">
            클릭하여 사진 선택
          </span>
          <span className="text-caption text-muted-foreground">
            JPEG, PNG, WebP (최대 5MB)
          </span>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleSelect}
            className="hidden"
          />
        </label>
      ) : (
        <div className="space-y-3">
          <div className="relative rounded-xl overflow-hidden bg-muted">
            {preview && (
              <img
                src={preview}
                alt="미리보기"
                className="h-48 w-full object-cover"
              />
            )}
            <button
              onClick={clearFile}
              className="absolute top-2 right-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-caption text-muted-foreground truncate">
            {file.name}
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-caption text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {file && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={clearFile}>
            취소
          </Button>
          <Button size="sm" onClick={handleUpload} disabled={uploading}>
            {uploading ? (
              <>
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                업로드 중...
              </>
            ) : (
              "업로드"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
