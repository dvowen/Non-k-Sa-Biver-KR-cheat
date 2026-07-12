import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  DEFAULT_CHUNKS_DIR,
  restoreRawJsChunks,
} from "./apply-translations.mjs";

test("default translation target uses the current upstream version", () => {
  assert.match(DEFAULT_CHUNKS_DIR, /site\/202605testtest050v7\/_next\/static\/chunks$/);
});

test("restoreRawJsChunks refreshes site chunks from raw originals", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "translation-apply-"));
  const rawDir = path.join(tempDir, "raw");
  const targetDir = path.join(tempDir, "site");
  await fs.mkdir(rawDir, { recursive: true });
  await fs.mkdir(targetDir, { recursive: true });

  await fs.writeFile(path.join(rawDir, "game.js"), 'text:"鉄の矢じり"');
  await fs.writeFile(path.join(rawDir, "style.css"), "body{}");
  await fs.writeFile(path.join(targetDir, "game.js"), 'text:"철 화살촉"');

  const copied = await restoreRawJsChunks(rawDir, targetDir);

  assert.equal(copied, 1);
  assert.equal(await fs.readFile(path.join(targetDir, "game.js"), "utf8"), 'text:"鉄の矢じり"');
  await assert.rejects(fs.stat(path.join(targetDir, "style.css")), /ENOENT/);
});
