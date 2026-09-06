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
        "rounded-xl border-2 border-dashed p-10 text-center transition-colors",
        isDragActive ? "border-accent bg-accent/5" : "border-border bg-surface",
        disabled ? "opacity-60" : "",
      ].join(" ")}
    >
      <input {...getInputProps()} aria-label="File upload input" />

      <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
        <UploadIcon />
        <div>
          <p className="text-base font-medium text-fg">
            {isDragActive ? "Drop files to add them" : "Drag & drop files here"}
          </p>
          <p className="mt-1 text-sm text-muted">
            PDF, DOCX, PPTX, JPG, PNG, WebP — up to 100 MB each
          </p>
        </div>
        <button
          type="button"
          onClick={open}
          disabled={disabled}
          className="mt-1 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Browse files
        </button>
      </div>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M17 8l-5-5-5 5" />
      <path d="M12 3v12" />
    </svg>
  );
}
