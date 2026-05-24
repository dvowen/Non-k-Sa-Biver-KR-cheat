import test from "node:test";
import assert from "node:assert/strict";
import {
  parseTranslationTsv,
  collectSpecialTokens,
  validateTokenPreservation,
  jsStringLiteralPattern,
} from "./translation-utils.mjs";

test("parseTranslationTsv reads source and korean columns", () => {
  const rows = parseTranslationTsv("source\tkorean\tnote\nこんにちは\t안녕\tgreeting\n");
  assert.deepEqual(rows, [{ source: "こんにちは", korean: "안녕", note: "greeting" }]);
});

test("collectSpecialTokens finds wait tags and placeholders", () => {
  assert.deepEqual(collectSpecialTokens("금액 {donationAmount}G [wait:0.5]"), [
    "{donationAmount}",
    "[wait:0.5]",
  ]);
});

test("validateTokenPreservation rejects missing source tokens", () => {
  assert.throws(
    () => validateTokenPreservation("金額 {donationAmount}G", "금액 G"),
    /Missing token/,
  );
});

test("jsStringLiteralPattern matches escaped source text", () => {
  const pattern = jsStringLiteralPattern("안녕\n하세요");
  assert.match('"안녕\\n하세요"', pattern);
});
