"use client";

import { useState } from "react";
import JSZip from "jszip";
import { Dropzone } from "./Dropzone";
import { FileList } from "./FileList";
import { useConverter } from "@/lib/store";
import { downloadBlob, formatTextForDownload } from "@/lib/format";
import { MAX_SERVER_UPLOAD_BYTES, type ConvertResponse } from "@/lib/types";
import { compressFiles } from "@/lib/client/compress";
import { convertInBrowser } from "@/lib/client/convert";

export function Converter() {
  const files = useConverter((s) => s.files);
  const addFiles = useConverter((s) => s.addFiles);
  const clearAll = useConverter((s) => s.clearAll);
  const isProcessing = useConverter((s) => s.isProcessing);
  const setProcessing = useConverter((s) => s.setProcessing);
  const markAll = useConverter((s) => s.markAll);
  const applyResult = useConverter((s) => s.applyResult);
  const applyError = useConverter((s) => s.applyError);

  const [banner, setBanner] = useState<string | null>(null);

  const queuedCount = files.filter((f) => f.status === "queued" || f.status === "processing").length;
  const doneFiles = files.filter((f) => f.status === "done" && f.result);

  async function handleConvert() {
    if (files.length === 0 || isProcessing) return;
    setBanner(null);
    setProcessing(true);
    markAll("processing");

    try {
      const uploadFiles = await compressFiles(files.map((f) => f.file));
      let failed = false;
      let converted = false;

      for (const file of uploadFiles) {
        try {
          if (file.size > MAX_SERVER_UPLOAD_BYTES) {
            applyResult(file.name, await convertInBrowser(file));
            converted = true;
            continue;
          }

          const form = new FormData();
          form.append("files", file, file.name);
          const res = await fetch("/api/convert", { method: "POST", body: form });
          if (!res.ok) throw new Error(`Server responded ${res.status}`);
          const data = (await res.json()) as ConvertResponse;
          for (const result of data.results) applyResult(result.filename, result);
          for (const err of data.errors) applyError(err.filename, err.error);
          converted ||= data.results.length > 0;
          failed ||= data.errors.length > 0;
        } catch (err) {
          failed = true;
          const msg = err instanceof Error ? err.message : "Conversion request failed.";
          applyError(file.name, msg);
        }
      }

      if (failed && !converted) {
        setBanner("No files could be converted. See details below.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Conversion request failed.";
      setBanner(msg);
      // Mark everything still processing as errored so the UI doesn't hang.
      for (const f of files) {
        if (f.status === "processing") applyError(f.file.name, msg);
      }
    } finally {
      setProcessing(false);
    }
  }

  async function handleDownloadAll() {
    if (doneFiles.length === 0) return;
    const zip = new JSZip();
    const used = new Map<string, number>();

    for (const f of doneFiles) {
      // Guard against duplicate output names (e.g. a.pdf and a.docx -> a.txt).
      let name = f.result!.outputName;
      const count = used.get(name) ?? 0;
      if (count > 0) {
        const dot = name.lastIndexOf(".");
        name = `${name.slice(0, dot)}-${count}${name.slice(dot)}`;
      }
      used.set(f.result!.outputName, count + 1);
      zip.file(name, formatTextForDownload(f.result!.text));
    }

    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(blob, "converted-text.zip");
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <Dropzone onFiles={addFiles} disabled={isProcessing} />

      {banner && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-600 dark:text-red-400 sm:px-4 sm:py-3">
          {banner}
        </div>
      )}

      {files.length > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <button
            type="button"
            onClick={handleConvert}
            disabled={isProcessing || queuedCount === 0}
            className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:py-2"
          >
            {isProcessing ? "Converting…" : `Convert ${queuedCount || ""} file${queuedCount === 1 ? "" : "s"}`.trim()}
          </button>

          {doneFiles.length > 1 && (
            <button
              type="button"
              onClick={handleDownloadAll}
              disabled={isProcessing}
              className="w-full rounded-md border border-border px-4 py-2.5 text-sm font-medium text-fg transition-colors hover:bg-border/40 disabled:opacity-50 sm:w-auto sm:py-2"
            >
              Download all as ZIP ({doneFiles.length})
            </button>
          )}

          <button
            type="button"
            onClick={clearAll}
            disabled={isProcessing}
            className="w-full rounded-md px-3 py-2.5 text-sm text-muted transition-colors hover:text-fg disabled:opacity-50 sm:ml-auto sm:w-auto sm:py-2"
          >
            Clear all
          </button>
        </div>
      )}

      <FileList />
    </div>
  );
}
