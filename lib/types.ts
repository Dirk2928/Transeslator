// Shared types across client and server.

export type SupportedExtension =
  | "pdf"
  | "docx"
  | "pptx"
  | "jpg"
  | "jpeg"
  | "png"
  | "webp";

export interface ConversionResult {
  /** Original filename, e.g. "report.pdf". */
  filename: string;
  /** Output filename, e.g. "report.txt". */
  outputName: string;
  /** Extracted (and optionally AI-enhanced) text. */
  text: string;
  /** Character count of the final text. */
  chars: number;
  /** Whether the AI enhancement step ran successfully. */
  enhanced: boolean;
  /** How the file was processed, for display. */
  kind: SupportedExtension;
  /** Non-fatal notes surfaced to the user (e.g. "OCR found little text"). */
  notes?: string;
}

export interface ConversionError {
  filename: string;
  error: string;
}

export interface ConvertResponse {
  results: ConversionResult[];
  errors: ConversionError[];
}

export const ACCEPTED_MIME: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

export function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot + 1).toLowerCase();
}

export function isSupported(filename: string): boolean {
  const ext = extensionOf(filename);
  return ["pdf", "docx", "pptx", "jpg", "jpeg", "png", "webp"].includes(ext);
}
