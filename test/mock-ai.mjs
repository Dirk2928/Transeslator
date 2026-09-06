// Minimal mock AI enhancement endpoint: uppercases text so we can prove the
// remote path was taken (vs. the local heuristic fallback).
import { createServer } from "node:http";

const server = createServer((req, res) => {
  if (req.method !== "POST") {
    res.writeHead(405).end();
    return;
  }
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    try {
      const { text } = JSON.parse(body);
      const auth = req.headers["authorization"] || "(none)";
      console.error(`mock-ai received ${text.length} chars, auth=${auth}`);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ text: `[[ENHANCED]]\n${text.toUpperCase()}` }));
    } catch {
      res.writeHead(400).end();
    }
  });
});

server.listen(4545, () => console.error("mock-ai on :4545"));
