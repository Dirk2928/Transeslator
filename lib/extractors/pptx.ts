// PPTX text extraction.
// A .pptx is a ZIP of XML parts. Slide text lives in ppt/slides/slideN.xml
// inside <a:t> runs. We unzip with JSZip and pull the text nodes in slide order.

import JSZip from "jszip";

/** Extract the concatenated text of all <a:t> nodes from one slide's XML. */
function textFromSlideXml(xml: string): string {
  const runs: string[] = [];
  // <a:t> may carry attributes; capture inner text of each.
  const re = /<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    runs.push(decodeXmlEntities(m[1]));
  }
  // Paragraph boundaries (<a:p>) become line breaks so slides don't collapse to one line.
  // We approximate by splitting on the paragraph close tag before extracting runs.
  return runs.join(" ");
}

/** Build slide text preserving paragraph line breaks. */
function slideText(xml: string): string {
  const paragraphs = xml.split(/<\/a:p>/);
  const lines = paragraphs
    .map((p) => textFromSlideXml(p).trim())
    .filter((line) => line.length > 0);
  return lines.join("\n");
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

export async function extractPptx(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);

  // Collect slide parts and sort them numerically (slide1, slide2, ... slide10).
  const slideNames = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const na = parseInt(a.match(/slide(\d+)\.xml$/)![1], 10);
      const nb = parseInt(b.match(/slide(\d+)\.xml$/)![1], 10);
      return na - nb;
    });

  const slides: string[] = [];
  for (let i = 0; i < slideNames.length; i++) {
    const xml = await zip.files[slideNames[i]].async("string");
    const text = slideText(xml);
    slides.push(`--- Slide ${i + 1} ---\n${text}`);
  }

  return slides.join("\n\n");
}
