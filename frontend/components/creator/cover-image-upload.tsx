"use client";

import { useRef, useState } from "react";
import { ImageIcon, Loader2, X } from "lucide-react";
import { uploadCreatorFile } from "@/lib/api/creator";
import { getErrorMessage } from "@/lib/api/client";

interface CoverImageUploadProps {
  value: string;
  onChange: (url: string) => void;
}

export function CoverImageUpload({ value, onChange }: CoverImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    const MAX = 10 * 1024 * 1024;
    if (file.size > MAX) {
      setUploadError("File must be under 10 MB");
      return;
    }
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      setUploadError("jpeg, png, webp, or gif only");
      return;
    }

    setUploadError(null);
    setUploading(true);
    try {
      const { url } = await uploadCreatorFile(file);
      onChange(url);
    } catch (err) {
      setUploadError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const clear = () => {
    onChange("");
    setUploadError(null);
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={handleChange}
        aria-label="Upload cover image"
      />

      {value ? (
        <div className="relative w-full aspect-[3/4] max-w-[140px] rounded-lg overflow-hidden border border-border/60 bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Cover preview"
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={clear}
            className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
            aria-label="Remove cover"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => !uploading && inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && !uploading && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className={[
            "flex flex-col items-center justify-center gap-2 w-full aspect-[3/4] max-w-[140px] rounded-lg border-2 border-dashed transition-colors",
            uploading
              ? "border-primary/40 bg-primary/5 cursor-wait"
              : "border-border/60 bg-muted/30 hover:border-primary/50 hover:bg-muted/50 cursor-pointer",
          ].join(" ")}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
          ) : (
            <>
              <ImageIcon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
              <span className="text-[10px] text-muted-foreground text-center leading-tight px-2">
                click or drag to upload
              </span>
            </>
          )}
        </div>
      )}

      {uploading && (
        <p className="text-xs text-muted-foreground">uploading to Walrus…</p>
      )}
      {uploadError && (
        <p className="text-xs text-destructive">{uploadError}</p>
      )}
    </div>
  );
}
