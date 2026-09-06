// Small formatting helpers shared by UI components.

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

/** Keep downloaded text files UTF-8, LF-delimited, and terminated by one newline. */
export function formatTextForDownload(text: string): string {
  const normalized = text.replace(/\r\n?/g, "\n").trimEnd();
  return normalized.length > 0 ? `${normalized}\n` : "";
}

/** Trigger a browser download for a blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
