"use client";

import JSZip from "jszip";
import { createWorker } from "tesseract.js";
import { localHeuristicClean } from "../enhance";
import { extensionOf, type ConversionResult, type SupportedExtension } from "../types";

function outputNameFor(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return `${dot === -1 ? filename : filename.slice(0, dot)}.txt`;
}

async function extractPdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc =
    `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  const document = await pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    useSystemFonts: true,
    isEvalSupported: false,
  }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    let lastY: number | null = null;
    let line = "";
    const lines: string[] = [];

    for (const item of content.items as Array<{ str: string; transform: number[] }>) {
      const y = item.transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        lines.push(line.trimEnd());
        line = "";
      }
      line += item.str;
      lastY = y;
    }
    if (line.trim()) lines.push(line.trimEnd());
    pages.push(lines.join("\n"));
    page.cleanup();
  }

  await document.cleanup();
  return pages.join("\n\n");
}

async function extractDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return result.value;
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

async function extractPptx(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const slideNames = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/slide(\d+)\.xml$/)![1]) - Number(b.match(/slide(\d+)\.xml$/)![1]));

  const slides: string[] = [];
  for (let index = 0; index < slideNames.length; index++) {
    const xml = await zip.files[slideNames[index]].async("string");
    const paragraphs = xml.split(/<\/a:p>/)
      .map((paragraph) => {
        const runs: string[] = [];
        const runPattern = /<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g;
        let match: RegExpExecArray | null;
        while ((match = runPattern.exec(paragraph)) !== null) {
          runs.push(decodeXmlEntities(match[1]));
        }
        return runs.join(" ").trim();
      })
      .filter(Boolean);
    slides.push(`--- Slide ${index + 1} ---\n${paragraphs.join("\n")}`);
  }
  return slides.join("\n\n");
}

async function extractImage(file: File): Promise<{ text: string; confidence: number }> {
  const worker = await createWorker("eng");
  try {
    const { data } = await worker.recognize(file);
    return { text: data.text, confidence: data.confidence };
  } finally {
    await worker.terminate();
  }
}

export async function convertInBrowser(file: File): Promise<ConversionResult> {
  const kind = extensionOf(file.name) as SupportedExtension;
  let rawText = "";
  let notes: string | undefined;

  switch (kind) {
    case "pdf":
      rawText = await extractPdf(file);
      break;
    case "docx":
      rawText = await extractDocx(file);
      break;
    case "pptx":
      rawText = await extractPptx(file);
      break;
    case "jpg":
    case "jpeg":
    case "png":
    case "webp": {
      const image = await extractImage(file);
      rawText = image.text;
      if (image.confidence < 40) {
        notes = `Low OCR confidence (${Math.round(image.confidence)}%). Image may contain little readable text.`;
      }
      break;
    }
    default:
      throw new Error(`Unsupported file type: .${kind}`);
  }

  if (!rawText.trim()) notes = notes ?? "No extractable text found in this file.";
  const text = localHeuristicClean(rawText);
  return {
    filename: file.name,
    outputName: outputNameFor(file.name),
    text,
    chars: text.length,
    enhanced: false,
    kind,
    notes,
  };
}
