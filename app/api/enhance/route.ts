import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  // 1. Parse and validate input
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { text, instructions } = body || {};
  
  if (!text || typeof text !== 'string') {
    return NextResponse.json(
      { error: 'Missing or invalid "text" field (must be non-empty string)' },
      { status: 422 }
    );
  }

  // 2. Call Gemini with proper error handling
  try {
    const geminiUrl = process.env.AI_ENHANCE_URL!;
    const apiKey = process.env.AI_ENHANCE_KEY;
    
    // Use query param auth since Bearer may not work for all Gemini endpoints
    const url = apiKey 
      ? `${geminiUrl}?key=${apiKey}` 
      : geminiUrl;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${instructions || 'Clean and reformat the following text:'}\n\n${text}`
          }]
        }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API error:', response.status, errText);
      return NextResponse.json(
        { error: `AI service error: ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const enhancedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!enhancedText) {
      return NextResponse.json(
        { error: 'Empty response from AI model' },
        { status: 502 }
      );
    }

    return NextResponse.json({ text: enhancedText });

  } catch (err) {
    console.error('Enhance route error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}