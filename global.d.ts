declare module "*.css";
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