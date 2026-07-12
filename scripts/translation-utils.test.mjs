import test from "node:test";
import assert from "node:assert/strict";
import {
  parseTranslationTsv,
  collectSpecialTokens,
  validateTokenPreservation,
  jsStringLiteralPattern,
  mergeTranslationRows,
  replaceJsStringLiterals,
  countReplaceableJsStringLiterals,
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

test("collectSpecialTokens preserves dynamic template expressions", () => {
  assert.deepEqual(
    collectSpecialTokens("${minutes}分${seconds}秒"),
    ["${minutes}", "${seconds}"],
  );
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

test("jsStringLiteralPattern treats literal TSV newline escapes as JS newlines", () => {
  const pattern = jsStringLiteralPattern("お？\\n見ない顔だな？");
  assert.match('"お？\\n見ない顔だな？"', pattern);
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

test("replaceJsStringLiterals replaces exact static template literals", () => {
  const input = "const label = `同じ種類のモンスターは連れて行けません`;";
  const output = replaceJsStringLiterals(input, [
    {
      source: "同じ種類のモンスターは連れて行けません",
      korean: "같은 종류의 몬스터는 데려갈 수 없습니다",
    },
  ]);
  assert.equal(output, 'const label = "같은 종류의 몬스터는 데려갈 수 없습니다";');
});

test("replaceJsStringLiterals replaces marked fragments inside template literals", () => {
  const input = "const message = `${name}を手に入れた！`;";
  const output = replaceJsStringLiterals(input, [
    {
      source: "を手に入れた！",
      korean: "을(를) 손에 넣었다!",
      note: "suffix fragment",
    },
  ]);
  assert.equal(output, "const message = `${name}을(를) 손에 넣었다!`;");
});

test("replaceJsStringLiterals replaces fragments across raw template newlines", () => {
  const input = "const message = `ナイスファイト！\n生存時間: ${minutes}分${seconds}秒\nスコア: ${score}`;";
  const output = replaceJsStringLiterals(input, [
    {
      source: "ナイスファイト！\\n生存時間: ",
      korean: "잘 싸웠어!\\n생존 시간: ",
      note: "template fragment",
    },
    { source: "分", korean: "분 ", note: "template fragment" },
    {
      source: "秒\\nスコア: ",
      korean: "초\\n점수: ",
      note: "template fragment",
    },
  ]);

  assert.equal(
    output,
    "const message = `잘 싸웠어!\n생존 시간: ${minutes}분 ${seconds}초\n점수: ${score}`;",
  );
});

test("replaceJsStringLiterals replaces a complete dynamic template literal", () => {
  const input = "const message = `ナイスファイト！\n生存時間: ${t}分${e%60}秒\nスコア: ${s}`;";
  const output = replaceJsStringLiterals(input, [
    {
      source: "ナイスファイト！\\n生存時間: ${t}分${e%60}秒\\nスコア: ${s}",
      korean: "잘 싸웠어!\\n생존 시간: ${t}분 ${e%60}초\\n점수: ${s}",
    },
  ]);

  assert.equal(
    output,
    "const message = `잘 싸웠어!\n생존 시간: ${t}분 ${e%60}초\n점수: ${s}`;",
  );
});

test("countReplaceableJsStringLiterals ignores no-op translations", () => {
  const input = 'label:"🐞 Debug", text:"タガン"';
  assert.equal(
    countReplaceableJsStringLiterals(input, [
      { source: "🐞 Debug", korean: "🐞 Debug" },
      { source: "タガン", korean: "타간" },
    ]),
    1,
  );
});
