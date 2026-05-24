import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { generateDebugItems } from "./generate-debug-items.mjs";

test("generateDebugItems writes extracted item metadata as JSON", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "debug-items-"));
  const chunkPath = path.join(tempDir, "chunk.js");
  const outputPath = path.join(tempDir, "debug-items.json");
  const itemText = Array.from({ length: 10 }, (_, index) => {
    const id = `item_${index}`;
    return `${id}:{id:"${id}",name:"아이템 ${index}",description:"설명 ${index}",effectType:"NONE",price:${index}}`;
  }).join(",");
  await fs.writeFile(chunkPath, `let items={${itemText}};`);

  const count = await generateDebugItems({ chunkPath, outputPath });
  const generated = JSON.parse(await fs.readFile(outputPath, "utf8"));

  assert.equal(count, 10);
  assert.equal(generated.length, 10);
  assert.deepEqual(generated[0], {
    id: "item_0",
    name: "아이템 0",
    description: "설명 0",
    effectType: "NONE",
    price: 0,
  });
});
