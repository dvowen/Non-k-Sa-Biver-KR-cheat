import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { generateDebugItems } from "./generate-debug-items.mjs";

const potion = String.raw`potion:{id:"potion",name:"회복약",description:"HP 회복",effectType:"HEAL",value:50,price:100}`;
const arrow = String.raw`arrow:{id:"arrow",name:"화살",description:"공격 강화",effectType:"PASSIVE_WEAPON",value:1,price:200}`;

test("generateDebugItems scans every hashed chunk and deduplicates item ids", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "debug-items-"));
  const chunksDir = path.join(tempDir, "chunks");
  const outputPath = path.join(tempDir, "debug-items.json");
  await fs.mkdir(chunksDir);
  await fs.writeFile(path.join(chunksDir, "first-hash.js"), `${potion},${arrow}`);
  await fs.writeFile(path.join(chunksDir, "second-hash.js"), potion);

  const count = await generateDebugItems({ chunksDir, outputPath, expectedCount: 2 });
  const items = JSON.parse(await fs.readFile(outputPath, "utf8"));

  assert.equal(count, 2);
  assert.deepEqual(items.map((item) => item.id), ["arrow", "potion"]);
});

test("generateDebugItems fails when the current version item count drifts", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "debug-items-drift-"));
  const chunksDir = path.join(tempDir, "chunks");
  await fs.mkdir(chunksDir);
  await fs.writeFile(path.join(chunksDir, "items.js"), potion);

  await assert.rejects(
    generateDebugItems({
      chunksDir,
      outputPath: path.join(tempDir, "debug-items.json"),
      expectedCount: 2,
    }),
    /Expected 2 debug items, found 1/,
  );
});
