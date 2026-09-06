// Orchestrates: pick extractor by extension -> extract text -> AI/heuristic enhance.

import { extractPdf } from "./extractors/pdf";
import { extractDocx } from "./extractors/docx";
import { extractPptx } from "./extractors/pptx";
import { extractImage } from "./extractors/image";
import { enhanceText } from "./enhance";
import { extensionOf, type ConversionResult, type SupportedExtension } from "./types";

/** Map an original filename to its .txt output name. */
function outputNameFor(filename: string): string {
  const dot = filename.lastIndexOf(".");
  const base = dot === -1 ? filename : filename.slice(0, dot);
  return `${base}.txt`;
}

export async function convertFile(
  filename: string,
  buffer: Buffer
): Promise<ConversionResult> {
  const ext = extensionOf(filename) as SupportedExtension;
  let rawText = "";
  let notes: string | undefined;

  switch (ext) {
    case "pdf":
      rawText = await extractPdf(buffer);
      break;
    case "docx":
      rawText = await extractDocx(buffer);
      break;
    case "pptx":
      rawText = await extractPptx(buffer);
      break;
    case "jpg":
    case "jpeg":
    case "png":
    case "webp": {
      const { text, confidence } = await extractImage(buffer);
      rawText = text;
      if (confidence < 40) {
        notes = `Low OCR confidence (${Math.round(confidence)}%). Image may contain little readable text.`;
      }
      break;
    }
    default:
      throw new Error(`Unsupported file type: .${ext}`);
  }

  if (!rawText || rawText.trim().length === 0) {
    notes = notes ?? "No extractable text found in this file.";
  }

  const { text, enhanced } = await enhanceText(rawText);

  return {
    filename,
    outputName: outputNameFor(filename),
    text,
    chars: text.length,
    enhanced,
    kind: ext,
    notes,
  };
}
