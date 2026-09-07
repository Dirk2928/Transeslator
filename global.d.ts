declare module "*.css";

// The pdfjs worker build ships no type declarations. We only need the module to
// resolve so it can be attached to `globalThis.pdfjsWorker`; `any` is fine here.
declare module "pdfjs-dist/legacy/build/pdf.worker.min.mjs";
declare module "pdfjs-dist/build/pdf.mjs" {
  interface PDFTextItem {
    str: string;
    transform: number[];
  }

  interface PDFPage {
    getTextContent(): Promise<{ items: PDFTextItem[] }>;
    cleanup(): void;
  }

  interface PDFDocument {
    numPages: number;
    getPage(pageNumber: number): Promise<PDFPage>;
    cleanup(): Promise<void>;
  }

  export function getDocument(options: {
    data: Uint8Array;
    useSystemFonts?: boolean;
    isEvalSupported?: boolean;
  }): { promise: Promise<PDFDocument> };
}