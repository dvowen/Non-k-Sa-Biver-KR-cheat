import assert from "node:assert/strict";
import test from "node:test";
import { findJapaneseSnippets } from "./audit-translations.mjs";

test("findJapaneseSnippets reports untranslated Japanese text", () => {
  assert.deepEqual(
    findJapaneseSnippets('const title = "未翻訳のタイトル";'),
    ["未翻訳のタイトル"],
  );
});

test("findJapaneseSnippets ignores the known non-player-facing source comment", () => {
  assert.deepEqual(
    findJapaneseSnippets("// 縦方向のスクロールを許可"),
    [],
  );
});

