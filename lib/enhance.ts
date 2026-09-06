// Pluggable AI text-enhancement step.
//
// If AI_ENHANCE_URL is configured, we POST the raw text to that endpoint and use
// its cleaned response. Otherwise (or on any failure) we fall back to a local
// heuristic that removes redundant lines and normalizes whitespace, so the app
// always produces usable output.
//
// Expected custom endpoint contract:
//   Request  (JSON): { "text": string, "instructions"?: string }
//   Response (JSON): { "text": string }   // cleaned text
// An optional bearer token is sent via AI_ENHANCE_KEY.

export interface EnhanceOutcome {
  text: string;
  enhanced: boolean; // true only if the remote AI endpoint succeeded
}

const DEFAULT_INSTRUCTIONS =
  "Remove redundant and repeated content. Improve clarity and structure. " +
  "Preserve the original meaning and all substantive information. Return plain text only.";

export async function enhanceText(raw: string): Promise<EnhanceOutcome> {
  const cleaned = localHeuristicClean(raw);

  const url = process.env.AI_ENHANCE_URL;
  if (!url) {
    // No endpoint configured — heuristic only.
    return { text: cleaned, enhanced: false };
  }

  // Don't bother the AI with trivially small inputs.
  if (cleaned.trim().length < 20) {
    return { text: cleaned, enhanced: false };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (process.env.AI_ENHANCE_KEY) {
      headers["Authorization"] = `Bearer ${process.env.AI_ENHANCE_KEY}`;
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ text: cleaned, instructions: DEFAULT_INSTRUCTIONS }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`AI endpoint returned ${res.status}`);
    }

    const data = (await res.json()) as { text?: unknown };
    if (typeof data.text !== "string" || data.text.trim().length === 0) {
      throw new Error("AI endpoint returned no usable text");
    }

    return { text: data.text, enhanced: true };
  } catch {
    // Any failure: fall back to the locally cleaned text. Never lose the user's content.
    return { text: cleaned, enhanced: false };
  }
}

export interface PromptOutcome {
  text: string;
  applied: boolean; // true only if the remote AI endpoint transformed the text
  message?: string; // human-readable reason when not applied
}

/**
 * Apply a user-supplied prompt to already-extracted text via the configured AI
 * endpoint. Unlike enhanceText(), this does NOT silently fall back to a heuristic:
 * a custom prompt implies a specific transformation the user asked for, so if no
 * endpoint is configured or the call fails we return the original text unchanged
 * plus a clear message the UI can surface.
 */
export async function applyPrompt(text: string, prompt: string): Promise<PromptOutcome> {
  const url = process.env.AI_ENHANCE_URL;
  if (!url) {
    return {
      text,
      applied: false,
      message: "No AI endpoint configured. Set AI_ENHANCE_URL to use custom prompts.",
    };
  }
  if (!prompt.trim()) {
    return { text, applied: false, message: "Enter a prompt first." };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (process.env.AI_ENHANCE_KEY) {
      headers["Authorization"] = `Bearer ${process.env.AI_ENHANCE_KEY}`;
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ text, instructions: prompt }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`AI endpoint returned ${res.status}`);
    }

    const data = (await res.json()) as { text?: unknown };
    if (typeof data.text !== "string" || data.text.trim().length === 0) {
      throw new Error("AI endpoint returned no usable text");
    }

    return { text: data.text, applied: true };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "request failed";
    return { text, applied: false, message: `AI prompt failed (${reason}). Text left unchanged.` };
  }
}

/**
 * Local, deterministic cleanup used both as the no-AI path and as a pre-pass:
 *  - normalize CRLF and stray carriage returns
 *  - collapse runs of blank lines to a single blank line
 *  - trim trailing whitespace per line
 *  - drop consecutive duplicate lines (common in OCR/PDF extraction)
 */
export function localHeuristicClean(raw: string): string {
  const normalized = raw.replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n").map((l) => l.replace(/[ \t]+$/g, ""));

  const out: string[] = [];
  let blankRun = 0;
  let prevNonBlank: string | null = null;

  for (const line of lines) {
    const isBlank = line.trim().length === 0;
    if (isBlank) {
      blankRun++;
      if (blankRun <= 1) out.push("");
      continue;
    }
    blankRun = 0;
    // Skip an immediate duplicate of the previous non-blank line.
    if (prevNonBlank !== null && line.trim() === prevNonBlank.trim()) {
      continue;
    }
    out.push(line);
    prevNonBlank = line;
  }

  // Trim leading/trailing blank lines.
  while (out.length && out[0].trim() === "") out.shift();
  while (out.length && out[out.length - 1].trim() === "") out.pop();

  return out.join("\n");
}
