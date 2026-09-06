# Transeslator

Convert **PDF, DOCX, PPTX, and images (JPG/PNG/WebP)** to clean plain text, with an optional, pluggable AI enhancement step that removes redundant content and improves structure.

Single Next.js 14 app — no external database, queue, or object storage required to run. Everything happens in-process and files are never persisted.

## Features

- Drag-and-drop multi-file upload (React Dropzone) with size validation (100 MB/file).
- Server-side extraction:
  - **PDF** — `pdfjs-dist` (line-reconstructed text).
  - **DOCX** — `mammoth` (raw text).
  - **PPTX** — `jszip` + slide XML parsing, one section per slide.
  - **Images** — OCR via `tesseract.js` (English), with a low-confidence warning.
- Per-file AI prompt chatbox for transforming extracted text before download.
- Per-file status, text preview, individual download, and **Download all as ZIP**.
- Dark / light / system theme toggle. Responsive, keyboard-accessible, respects `prefers-reduced-motion`.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

> First OCR run downloads the Tesseract English model and WASM (~a few MB). Subsequent runs reuse the cached worker within the server process.

## AI prompt endpoint

Copy `.env.example` to `.env.local` and set:

```
AI_ENHANCE_URL=https://your-service.example.com/enhance
AI_ENHANCE_KEY=optional-bearer-token
```

Your endpoint receives:

```json
{ "text": "raw extracted text", "instructions": "Remove redundant content…" }
```

and must return:

```json
{ "text": "cleaned text" }
```

The AI button reports endpoint errors without changing the extracted text. Normal conversion still uses the local cleanup pass when no endpoint is configured.

## Format support notes

- Only the **modern OOXML** office formats are supported: `.docx` and `.pptx`. Legacy binary `.doc` / `.ppt` are rejected with a clear message — re-save them in the newer format.
- OCR quality depends on image clarity; scanned/low-contrast images may yield little text (surfaced as a warning).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server. |
| `npm run build` | Production build. |
| `npm start` | Serve the production build. |
| `npm test` | Run unit tests for the local text-cleanup heuristic. |

## Testing

```bash
npm test
```

Covers the deterministic `localHeuristicClean` logic (blank-line collapsing, adjacent-duplicate removal, CRLF normalization, trimming). Extraction and OCR are integration-level and best verified by uploading sample files.

## Architecture

```
app/
  api/convert/route.ts   POST endpoint: validates, dispatches per file, returns results + errors
  page.tsx               UI shell
  layout.tsx providers   theming
components/               Dropzone, FileList, Converter, ThemeToggle
lib/
  convert.ts             extractor dispatch + enhancement orchestration
  extractors/            pdf, docx, pptx, image(OCR)
  enhance.ts             pluggable AI call + local heuristic fallback
  store.ts               Zustand client state
  types.ts               shared types + validation constants
```

Files are processed sequentially per request to keep memory bounded on a single serverless instance. For very high volume you'd move extraction to a dedicated worker/queue — intentionally out of scope for this single-app build.

## Deployment

Deploys to Vercel as a standard Next.js app. Set `AI_ENHANCE_URL` / `AI_ENHANCE_KEY` in the project's environment variables if you want the AI step. Note that serverless function execution limits apply to very large files/OCR jobs.

## License

MIT
