import test from "node:test";
import assert from "node:assert/strict";
import {
  parseTranslationTsv,
  collectSpecialTokens,
  validateTokenPreservation,
  jsStringLiteralPattern,
  mergeTranslationRows,
  replaceJsStringLiterals,
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

test("mergeTranslationRows rejects conflicting translations", () => {
  assert.throws(
    () =>
      mergeTranslationRows([
        { source: "タガン", korean: "타간" },
        { source: "タガン", korean: "타건" },
      ]),
    /Conflicting translation/,
  );
});

test("replaceJsStringLiterals replaces exact JS string literals only", () => {
  const input = 'text:"タガン", label:"タガンとの会話", other:"非タガン文字"';
  const output = replaceJsStringLiterals(input, [
    { source: "タガンとの会話", korean: "타간과의 대화" },
    { source: "タガン", korean: "타간" },
  ]);
  assert.equal(output, 'text:"타간", label:"타간과의 대화", other:"非タガン文字"');
});
