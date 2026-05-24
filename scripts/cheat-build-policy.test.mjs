import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";

const SITE_DIR = path.resolve("site/202604testtes004v6");

test("cheat build exposes debug tools and keeps save manager", async () => {
  const indexHtml = await fs.readFile(path.join(SITE_DIR, "index.html"), "utf8");

  assert.match(indexHtml, /debug-tools\.js/);
  await fs.access(path.join(SITE_DIR, "debug-tools.js"));
  await fs.access(path.join(SITE_DIR, "debug-items.json"));
  await fs.access(path.join(SITE_DIR, "save-manager.html"));
  await assert.rejects(fs.access(path.join(SITE_DIR, "import-save.html")));
});

test("cheat README describes the test tools without exposing the source URL", async () => {
  const readme = await fs.readFile("README.md", "utf8");

  assert.match(readme, /비공식 한국어 번역/);
  assert.match(readme, /관리자 도구/);
  assert.doesNotMatch(readme, /funa-funa|Source URL|Run Locally|로컬 실행/i);
});
