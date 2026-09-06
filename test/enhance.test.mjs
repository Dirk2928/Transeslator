import { test } from "node:test";
import assert from "node:assert/strict";
import { localHeuristicClean } from "../lib/enhance.ts";

test("collapses multiple blank lines to one", () => {
  const input = "a\n\n\n\nb";
  assert.equal(localHeuristicClean(input), "a\n\nb");
});

test("drops consecutive duplicate lines", () => {
  const input = "Header\nHeader\nBody";
  assert.equal(localHeuristicClean(input), "Header\nBody");
});

test("keeps non-adjacent duplicates", () => {
  const input = "Title\nBody\nTitle";
  assert.equal(localHeuristicClean(input), "Title\nBody\nTitle");
});

test("normalizes CRLF and trims trailing whitespace", () => {
  const input = "line1  \r\nline2\t\r\n";
  assert.equal(localHeuristicClean(input), "line1\nline2");
});

test("trims leading and trailing blank lines", () => {
  const input = "\n\nhello\n\n";
  assert.equal(localHeuristicClean(input), "hello");
});

test("empty input yields empty string", () => {
  assert.equal(localHeuristicClean(""), "");
});
