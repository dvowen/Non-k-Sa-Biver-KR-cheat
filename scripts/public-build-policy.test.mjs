import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { SITE_DIR } from "./version-config.mjs";

test("public KR site does not expose debug tools", async () => {
  const indexHtml = await fs.readFile(path.join(SITE_DIR, "index.html"), "utf8");

  assert.doesNotMatch(indexHtml, /debug-tools\.js|debug-items\.json/);
  await assert.rejects(fs.access(path.join(SITE_DIR, "debug-tools.js")));
  await assert.rejects(fs.access(path.join(SITE_DIR, "debug-items.json")));
  await fs.access(path.join(SITE_DIR, "save-manager.html"));
  await assert.rejects(fs.access(path.join(SITE_DIR, "import-save.html")));
});

test("public README is a concise Korean translation notice", async () => {
  const readme = await fs.readFile("README.md", "utf8");

  assert.match(readme, /비공식 한국어 번역/);
  assert.doesNotMatch(readme, /funa-funa|Source URL|Run Locally|로컬 실행|debug|cheat|치트/i);
});
