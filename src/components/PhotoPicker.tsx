import { useRef } from "react";

interface Props {
  file: File | null;
  preview: string | null;
  onChange: (file: File | null) => void;
  /** Optional error message shown beneath the buttons. */
  hint?: string;
}

/**
 * Two-button photo picker:
 *  - "Take photo" → opens camera on mobile (capture="environment").
 *  - "Choose from gallery" → opens the file picker, no capture attr,
 *    so both gallery and other sources show up.
 *
 * Why two inputs?  iOS/Android only show "gallery" when `capture` is absent.
 * One input with capture forces the camera; one without offers the gallery.
 */
export function PhotoPicker({ file, preview, onChange, hint }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (f && f.size > 10 * 1024 * 1024) {
      onChange(null);
      alert("Image too large (max 10 MB).");
      return;
    }
    onChange(f);
    e.target.value = ""; // allow re-picking the same file later
  }

  if (preview && file) {
    return (
      <div className="flex items-start gap-3">
        <img
          src={preview}
          alt="Selected"
          className="w-32 h-32 object-cover rounded-lg border border-border"
        />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] truncate">{file.name}</p>
          <p className="text-[12px] text-text-muted">
            {(file.size / 1024).toFixed(0)} KB
          </p>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="mt-2 text-[12px] text-urgent hover:underline"
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="h-12 border border-border rounded-[8px] text-[13px] text-text-secondary hover:border-orange hover:text-orange transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <circle cx="12" cy="13" r="3" />
          </svg>
          Take photo
        </button>
        <button
          type="button"
          onClick={() => galleryRef.current?.click()}
          className="h-12 border border-border rounded-[8px] text-[13px] text-text-secondary hover:border-orange hover:text-orange transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 15l-5-5L5 21" />
          </svg>
          Choose from gallery
        </button>
      </div>
      <p className="text-[11px] text-text-muted mt-2 text-center">
        JPG / PNG / HEIC, up to 10 MB
      </p>
      {hint && (
        <p className="text-[12px] text-orange mt-2 text-center">{hint}</p>
      )}

      {/* Camera-only input (mobile uses rear camera) */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePick}
      />
      {/* No capture attr → file picker shows gallery, files, etc. */}
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePick}
      />
    </div>
  );
}
