"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useConverter, type QueuedFile } from "@/lib/store";
import { formatBytes, downloadBlob } from "@/lib/format";

export function FileList() {
  const files = useConverter((s) => s.files);
  const removeFile = useConverter((s) => s.removeFile);
  const isProcessing = useConverter((s) => s.isProcessing);

  if (files.length === 0) return null;

  return (
    <ul className="flex flex-col gap-2" aria-label="Uploaded files">
      <AnimatePresence initial={false}>
        {files.map((f) => (
          <motion.li
            key={f.id}
            layout
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="rounded-lg border border-border bg-surface p-3"
          >
            <Row file={f} onRemove={() => removeFile(f.id)} canRemove={!isProcessing} />
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

function Row({
  file,
  onRemove,
  canRemove,
}: {
  file: QueuedFile;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const [showPreview, setShowPreview] = useState(false);
  const r = file.result;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <StatusDot status={file.status} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-fg">{file.file.name}</p>
          <p className="text-xs text-muted">
            {formatBytes(file.file.size)}
            {r ? ` → ${r.chars.toLocaleString()} chars` : ""}
            {r?.enhanced ? " · AI-enhanced" : r ? " · cleaned" : ""}
          </p>
        </div>

        {file.status === "done" && r && (
          <>
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              className="rounded-md border border-border px-2.5 py-1 text-xs text-fg hover:bg-border/40"
              aria-expanded={showPreview}
            >
              {showPreview ? "Hide" : "Preview"}
            </button>
            <button
              type="button"
              onClick={() =>
                downloadBlob(new Blob([r.text], { type: "text/plain;charset=utf-8" }), r.outputName)
              }
              className="rounded-md border border-border px-2.5 py-1 text-xs text-fg hover:bg-border/40"
            >
              Download
            </button>
          </>
        )}

        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${file.file.name}`}
            className="rounded-md p-1 text-muted hover:text-fg"
          >
            <XIcon />
          </button>
        )}
      </div>

      {file.status === "error" && file.error && (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
          {file.error}
        </p>
      )}

      {r?.notes && (
        <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          {r.notes}
        </p>
      )}

      {showPreview && r && (
        <pre className="max-h-64 overflow-auto rounded-md bg-bg p-3 text-xs text-fg whitespace-pre-wrap break-words">
          {r.text.slice(0, 5000) || "(empty)"}
          {r.text.length > 5000 ? "\n\n… preview truncated …" : ""}
        </pre>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: QueuedFile["status"] }) {
  const map: Record<QueuedFile["status"], string> = {
    queued: "bg-muted",
    processing: "bg-accent animate-pulse",
    done: "bg-green-500",
    error: "bg-red-500",
  };
  return <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${map[status]}`} aria-hidden="true" />;
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
