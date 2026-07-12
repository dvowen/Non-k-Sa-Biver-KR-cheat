import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { SITE_DIR } from "./version-config.mjs";

test("v0.7 preserves the v0.6 save key and schema version", async () => {
  const chunkDir = path.join(SITE_DIR, "_next", "static", "chunks");
  const files = (await fs.readdir(chunkDir)).filter((name) => name.endsWith(".js"));
  const source = (await Promise.all(
    files.map((name) => fs.readFile(path.join(chunkDir, name), "utf8")),
  )).join("\n");

  assert.match(source, /loot_and_link_save_v1/);
  assert.match(source, /Version mismatch: Save \$\{a\.version\} vs Current 1/);
  assert.match(source, /version:1,survivalHighScore/);
});

