// PDF text extraction using pdfjs-dist in a Node context.
// We use the legacy build which runs without a browser DOM.

export async function extractPdf(buffer: Buffer): Promise<string> {
  // Import the legacy build lazily so the heavy dependency only loads when needed.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // Run pdfjs on the main thread (no web worker).
  //
  // In a bundled serverless runtime (Vercel), pdfjs's internal `isNodeJS` check
  // evaluates to false because the bundler rewrites `process`, so pdfjs takes
  // its browser code path and demands `GlobalWorkerOptions.workerSrc` — throwing
  // `No "GlobalWorkerOptions.workerSrc" specified.`. We avoid the worker entirely
  // by exposing the worker's message handler on `globalThis.pdfjsWorker`; pdfjs
  // then parses inline on the main thread and never spawns a Worker. The import
  // resolves from node_modules at runtime because `pdfjs-dist` is listed in
  // `serverComponentsExternalPackages` (see next.config.mjs), so it is not
  // bundled into the function.
  const globalScope = globalThis as unknown as { pdfjsWorker?: unknown };
  if (!globalScope.pdfjsWorker) {
    globalScope.pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs");
  }
  // Fallback for pdfjs builds that skip the main-thread handler path: a bare
  // specifier resolvable from node_modules (never fetched when the above works).
  pdfjs.GlobalWorkerOptions.workerSrc = "pdfjs-dist/legacy/build/pdf.worker.min.mjs";

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
