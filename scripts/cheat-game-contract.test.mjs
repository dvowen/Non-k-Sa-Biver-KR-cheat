import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { SITE_DIR } from "./version-config.mjs";

async function readGameChunks() {
  const chunksDir = path.join(SITE_DIR, "_next", "static", "chunks");
  const files = (await fs.readdir(chunksDir)).filter((name) => name.endsWith(".js"));
  return (await Promise.all(
    files.map((name) => fs.readFile(path.join(chunksDir, name), "utf8")),
  )).join("\n");
}

test("v0.7 keeps every EventBus contract used by the cheat overlay", async () => {
  const source = await readGameChunks();

  for (const eventName of [
    "add-coins",
    "add-item",
    "debug-forward-time",
    "request-auto-save",
    "resurrection-activated",
    "update-player-hp",
  ]) {
    assert.match(source, new RegExp(`EventBus\\.(?:on|emit)\\(\\"${eventName}\\"`));
  }
  assert.match(source, /handleDebugForwardTime\(e\)\{[^}]*survivalSeconds\+=e/);
});

test("v0.7 keeps the in-game settings markers used by the five-tap unlock", async () => {
  const source = await readGameChunks();

  assert.match(source, /children:"설정"/);
  assert.match(source, /설정은 자동으로 저장됩니다/);
});
