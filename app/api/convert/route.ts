// POST /api/convert
// Accepts multipart/form-data with one or more "files" fields.
// Returns { results: ConversionResult[], errors: ConversionError[] }.
//
// Runs on the Node.js runtime (not Edge) because extractors use Node APIs and
// large binary buffers.

import { NextRequest, NextResponse } from "next/server";
import { convertFile } from "@/lib/convert";
import {
  MAX_FILE_BYTES,
  isSupported,
  extensionOf,
  type ConvertResponse,
  type ConversionResult,
  type ConversionError,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300; // allow long OCR/large-PDF jobs where the platform permits

// Legacy binary formats we explicitly cannot handle in pure JS.
const LEGACY_BINARY = new Set(["ppt", "doc"]);

export async function POST(req: NextRequest): Promise<NextResponse<ConvertResponse>> {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { results: [], errors: [{ filename: "(request)", error: "Invalid multipart form data." }] },
      { status: 400 }
    );
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File);

  if (files.length === 0) {
    return NextResponse.json(
      { results: [], errors: [{ filename: "(request)", error: "No files provided." }] },
      { status: 400 }
    );
  }

  const results: ConversionResult[] = [];
  const errors: ConversionError[] = [];

  // Process sequentially: OCR and PDF parsing are CPU-heavy, and running them
  // in parallel on a single serverless instance tends to exhaust memory.
  for (const file of files) {
    try {
      const ext = extensionOf(file.name);

      if (LEGACY_BINARY.has(ext)) {
        errors.push({
          filename: file.name,
          error: `Legacy .${ext} isn't supported. Please re-save as .${ext}x and try again.`,
        });
        continue;
      }

      if (!isSupported(file.name)) {
        errors.push({ filename: file.name, error: `Unsupported file type: .${ext || "unknown"}.` });
        continue;
      }

      if (file.size > MAX_FILE_BYTES) {
        errors.push({
          filename: file.name,
          error: `File is ${(file.size / 1024 / 1024).toFixed(1)} MB, over the ${MAX_FILE_BYTES / 1024 / 1024} MB limit.`,
        });
        continue;
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await convertFile(file.name, buffer);
      results.push(result);
    } catch (err) {
      errors.push({
        filename: file.name,
        error: err instanceof Error ? err.message : "Unknown conversion error.",
      });
    }
  }

  return NextResponse.json({ results, errors });
}
