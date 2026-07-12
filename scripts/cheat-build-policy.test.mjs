import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  GITHUB_PAGES_BASE_PATH,
  SITE_DIR,
} from "./version-config.mjs";

test("cheat site exposes debug tools and keeps save management", async () => {
  const indexHtml = await fs.readFile(path.join(SITE_DIR, "index.html"), "utf8");
  const items = JSON.parse(await fs.readFile(path.join(SITE_DIR, "debug-items.json"), "utf8"));

  assert.match(indexHtml, /debug-tools\.js/);
  await fs.access(path.join(SITE_DIR, "debug-tools.js"));
  assert.equal(items.length, 44);
  await fs.access(path.join(SITE_DIR, "save-manager.html"));
  await assert.rejects(fs.access(path.join(SITE_DIR, "import-save.html")));
});

test("cheat release uses its own Pages path and Korean warning", async () => {
  const readme = await fs.readFile("README.md", "utf8");

  assert.equal(GITHUB_PAGES_BASE_PATH, "/Non-k-Sa-Biver-KR-cheat");
  assert.match(readme, /v0\.7/);
  assert.match(readme, /관리자 도구/);
  assert.match(readme, /일반 공유용.*기본판/);
  assert.doesNotMatch(readme, /v0\.6|funa-funa|Source URL|Run Locally|로컬 실행/i);
});

test("pull requests verify the cheat build without deploying Pages", async () => {
  const workflow = await fs.readFile(".github/workflows/pages.yml", "utf8");

  assert.match(workflow, /pull_request:\s*\n\s*branches: \["main"\]/);
  assert.match(workflow, /node scripts\/prepare-cheat-build\.mjs/);
  assert.match(workflow, /if: github\.event_name != 'pull_request'/);
  assert.match(workflow, /node scripts\/audit-translations\.mjs/);
});
