// DOCX text extraction using mammoth (raw text mode).
// Legacy binary .doc is not supported by mammoth; the router rejects it upstream.

export async function extractDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}
