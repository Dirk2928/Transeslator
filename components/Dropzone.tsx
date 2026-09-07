"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { ACCEPTED_MIME } from "@/lib/types";

export function Dropzone({
  onFiles,
  disabled,
}: {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}) {
  const onDrop = useCallback((accepted: File[]) => onFiles(accepted), [onFiles]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: ACCEPTED_MIME,
    disabled,
    noClick: true, // we provide an explicit button for clarity/accessibility
  });

  return (
    <div
      {...getRootProps()}
      className={[
        "rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors sm:px-6 sm:py-10 lg:py-14",
        isDragActive ? "border-accent bg-accent/5" : "border-border bg-surface",
        disabled ? "opacity-60" : "",
      ].join(" ")}
    >
      <input {...getInputProps()} aria-label="File upload input" />

      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-3">
        <UploadIcon />
        <div>
          <p className="text-sm font-medium text-fg sm:text-base">
            {/* Touch devices have no drag-and-drop, so lead with the tap action. */}
            <span className="sm:hidden">
              {isDragActive ? "Drop files to add them" : "Add files to convert"}
            </span>
            <span className="hidden sm:inline">
              {isDragActive ? "Drop files to add them" : "Drag & drop files here"}
            </span>
          </p>
          <p className="mt-1 text-xs text-muted sm:text-sm">
            PDF, DOCX, PPTX, JPG, PNG, WebP — large files supported
          </p>
        </div>
        <button
          type="button"
          onClick={open}
          disabled={disabled}
          className="mt-1 w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          Browse files
        </button>
      </div>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7 text-muted sm:h-8 sm:w-8" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M17 8l-5-5-5 5" />
      <path d="M12 3v12" />
    </svg>
  );
}
