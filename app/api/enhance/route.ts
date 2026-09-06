import { NextRequest, NextResponse } from "next/server";
import { applyPrompt } from "@/lib/enhance";

export const runtime = "nodejs";

interface EnhanceRequest {
  text?: unknown;
  prompt?: unknown;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: EnhanceRequest;
  try {
    body = (await req.json()) as EnhanceRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
  }

  if (typeof body.text !== "string" || typeof body.prompt !== "string") {
    return NextResponse.json({ error: "Text and prompt are required." }, { status: 400 });
  }

  const outcome = await applyPrompt(body.text, body.prompt);
  if (!outcome.applied) {
    return NextResponse.json({ error: outcome.message ?? "AI prompt was not applied." }, { status: 422 });
  }

  return NextResponse.json({ text: outcome.text });
}
