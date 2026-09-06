// PDF text extraction using pdfjs-dist in a Node context.
// We use the legacy build which runs without a browser DOM.

export async function extractPdf(buffer: Buffer): Promise<string> {
  // Import the legacy build lazily so the heavy dependency only loads when needed.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // Disable the worker: in a serverless/Node context we run on the main thread.
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    // Avoid attempts to fetch standard fonts over the network.
    useSystemFonts: true,
    isEvalSupported: false,
  });

  const doc = await loadingTask.promise;
  const pages: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    // Join text items; pdfjs gives us positioned runs, we reconstruct lines loosely.
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

  await doc.cleanup();
  return pages.join("\n\n");
}
