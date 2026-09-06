// POST /api/convert
// Accepts multipart/form-data with one or more "files" fields.
// Returns { results: ConversionResult[], errors: ConversionError[] }.
//
// Runs on the Node.js runtime (not Edge) because extractors use Node APIs and
// large binary buffers.

import { NextRequest, NextResponse } from "next/server";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { convertFile } from "@/lib/convert";
import {
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

const UPLOAD_DIR = path.join(tmpdir(), "transeslator-uploads");

function jsonResponse(response: ConvertResponse, status = 200) {
  return NextResponse.json(response, { status });
}

async function convertOne(fileName: string, buffer: Buffer): Promise<ConvertResponse> {
  const ext = extensionOf(fileName);

  if (LEGACY_BINARY.has(ext)) {
    return {
      results: [],
      errors: [{ filename: fileName, error: `Legacy .${ext} isn't supported. Please re-save as .${ext}x and try again.` }],
    };
  }

  if (!isSupported(fileName)) {
    return {
      results: [],
      errors: [{ filename: fileName, error: `Unsupported file type: .${ext || "unknown"}.` }],
    };
  }

  try {
    return { results: [await convertFile(fileName, buffer)], errors: [] };
  } catch (err) {
    return {
      results: [],
      errors: [{ filename: fileName, error: err instanceof Error ? err.message : "Unknown conversion error." }],
    };
  }
}

async function handleChunk(req: NextRequest): Promise<NextResponse> {
  const uploadId = req.headers.get("x-upload-id") ?? "";
  const fileNameHeader = req.headers.get("x-file-name") ?? "";
  const chunkIndex = Number(req.headers.get("x-chunk-index"));
  const totalChunks = Number(req.headers.get("x-total-chunks"));

  if (!/^[a-zA-Z0-9-]{16,100}$/.test(uploadId) || !fileNameHeader ||
      !Number.isInteger(chunkIndex) || !Number.isInteger(totalChunks) ||
      chunkIndex < 0 || totalChunks < 1 || chunkIndex >= totalChunks) {
    return jsonResponse({
      results: [],
      errors: [{ filename: "(request)", error: "Invalid upload chunk metadata." }],
    }, 400);
  }

  let fileName: string;
  try {
    fileName = Buffer.from(fileNameHeader, "base64url").toString("utf8");
  } catch {
    return jsonResponse({
      results: [],
      errors: [{ filename: "(request)", error: "Invalid upload filename." }],
    }, 400);
  }

  const uploadPath = path.join(UPLOAD_DIR, `${uploadId}.upload`);
  const metadataPath = path.join(UPLOAD_DIR, `${uploadId}.json`);
  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
    const metadata = chunkIndex === 0
      ? { fileName, totalChunks, nextChunk: 0 }
      : JSON.parse(await readFile(metadataPath, "utf8")) as {
          fileName: string;
          totalChunks: number;
          nextChunk: number;
        };

    if (metadata.fileName !== fileName || metadata.totalChunks !== totalChunks ||
        metadata.nextChunk !== chunkIndex) {
      return jsonResponse({
        results: [],
        errors: [{ filename: fileName, error: "Upload chunks arrived out of order." }],
      }, 409);
    }

    const chunk = Buffer.from(await req.arrayBuffer());
    await writeFile(uploadPath, chunk, { flag: chunkIndex === 0 ? "w" : "a" });

    if (chunkIndex < totalChunks - 1) {
      await writeFile(metadataPath, JSON.stringify({ ...metadata, nextChunk: chunkIndex + 1 }));
      return NextResponse.json({ complete: false });
    }

    const result = await convertOne(fileName, await readFile(uploadPath));
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({
      results: [],
      errors: [{ filename: fileName, error: err instanceof Error ? err.message : "Large file upload failed." }],
    }, 500);
  } finally {
    if (chunkIndex === totalChunks - 1) {
      await Promise.all([
        rm(uploadPath, { force: true }),
        rm(metadataPath, { force: true }),
      ]);
    }
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (req.headers.has("x-upload-id")) {
    return handleChunk(req);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonResponse(
      { results: [], errors: [{ filename: "(request)", error: "Invalid multipart form data." }] },
      400
    );
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File);

  if (files.length === 0) {
    return jsonResponse(
      { results: [], errors: [{ filename: "(request)", error: "No files provided." }] },
      400
    );
  }

  const results: ConversionResult[] = [];
  const errors: ConversionError[] = [];

  // Process sequentially: OCR and PDF parsing are CPU-heavy, and running them
  // in parallel on a single serverless instance tends to exhaust memory.
  for (const file of files) {
    const response = await convertOne(file.name, Buffer.from(await file.arrayBuffer()));
    results.push(...response.results);
    errors.push(...response.errors);
  }

  return NextResponse.json({ results, errors });
}
