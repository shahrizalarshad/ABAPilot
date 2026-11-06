"use client";

import { useRef, useState, type ReactNode } from "react";
import { FileUp, Loader2, X } from "lucide-react";

type Props = {
  label: string;
  hint?: string;
  accept: string;
  multiple?: boolean;
  /** Names of the files currently loaded (shown as chips). */
  files: string[];
  onFiles: (files: File[]) => Promise<void>;
  onClear: () => void;
  /** The editable text area showing the extracted content. */
  children: ReactNode;
};

/** A text field that can also be filled by dropping or choosing files. */
export function UploadField({
  label,
  hint,
  accept,
  multiple,
  files,
  onFiles,
  onClear,
  children,
}: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handle = async (list: FileList | null) => {
    const picked = Array.from(list ?? []);
    if (!picked.length) return;
    setError("");
    setBusy(true);
    try {
      await onFiles(multiple ? picked : picked.slice(0, 1));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read the file.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-md border border-line-strong px-2 py-1 text-xs hover:bg-sunken disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileUp className="h-3.5 w-3.5" />
          )}
          Upload file{multiple ? "s" : ""}
        </button>
        <input
          ref={input}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => handle(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {files.map((f, i) => (
            <span
              key={`${f}-${i}`}
              className="rounded bg-spruce-soft px-2 py-0.5 font-mono text-xs text-spruce"
            >
              {f}
            </span>
          ))}
          <button
            type="button"
            onClick={() => {
              onClear();
              setError("");
            }}
            className="inline-flex items-center gap-0.5 text-xs text-muted hover:text-markup"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handle(e.dataTransfer.files);
        }}
        className={`rounded-md ${dragging ? "ring-2 ring-spruce ring-offset-2 ring-offset-paper" : ""}`}
      >
        {children}
      </div>

      {error ? (
        <span className="block text-xs text-markup">{error}</span>
      ) : (
        hint && <span className="block text-xs text-muted">{hint}</span>
      )}
    </div>
  );
}
