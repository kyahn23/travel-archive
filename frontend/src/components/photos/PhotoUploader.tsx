"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Upload, Loader2, AlertCircle } from "lucide-react";
import { api, ApiError } from "@/lib/api/client";

const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

interface PhotoUploaderProps {
  timelineItemId: number;
  onUploaded: () => void;
  onCancel: () => void;
}

export function PhotoUploader({ timelineItemId, onUploaded, onCancel }: PhotoUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

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
      await api.upload(`/timeline-items/${timelineItemId}/photos`, formData);
      onUploaded();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.body || "업로드에 실패했습니다.");
      } else {
        setError("업로드에 실패했습니다.");
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="photo-uploader-title"
      className="rounded-xl bg-card border p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-title font-semibold" id="photo-uploader-title">사진 업로드</h4>
        <button
          type="button"
          aria-label="업로드 취소"
          onClick={onCancel}
          className="rounded-md p-1 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" aria-hidden="true" />
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
              // Blob URLs cannot be optimized by next/image.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt="미리보기"
                className="h-48 w-full object-cover"
              />
            )}
            <button
              type="button"
              aria-label="선택한 사진 제거"
              onClick={clearFile}
              className="absolute top-2 right-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" aria-hidden="true" />
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
