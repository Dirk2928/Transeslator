// Image OCR using tesseract.js.
// The worker downloads language traineddata + wasm on first use; we cache the
// worker across requests within a single server process to avoid re-init cost.

import type { Worker } from "tesseract.js";

let workerPromise: Promise<Worker> | null = null;

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import("tesseract.js");
      // "eng" by default; tesseract.js v5 loads language in createWorker.
      const worker = await createWorker("eng");
      return worker;
    })();
  }
  return workerPromise;
}

export interface ImageExtraction {
  text: string;
  /** Mean OCR confidence 0-100; low values suggest a non-text image. */
  confidence: number;
}

export async function extractImage(buffer: Buffer): Promise<ImageExtraction> {
  const worker = await getWorker();
  const { data } = await worker.recognize(buffer);
  return { text: data.text, confidence: data.confidence };
}
