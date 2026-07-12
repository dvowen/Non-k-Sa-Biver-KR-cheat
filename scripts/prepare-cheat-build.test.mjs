import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { prepareCheatBuild } from "./prepare-cheat-build.mjs";

test("prepareCheatBuild generates the manifest and injects the loader", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "prepare-cheat-"));
  const chunksDir = path.join(tempDir, "chunks");
  const indexPath = path.join(tempDir, "index.html");
  const outputPath = path.join(tempDir, "debug-items.json");
  await fs.mkdir(chunksDir);
  await fs.writeFile(
    path.join(chunksDir, "items.js"),
    String.raw`potion:{id:"potion",name:"회복약",description:"HP 회복",effectType:"HEAL",value:50,price:100}`,
  );
  await fs.writeFile(indexPath, "<html><body></body></html>");

  const result = await prepareCheatBuild({
    chunksDir,
    indexPath,
    outputPath,
    scriptSrc: "/test/debug-tools.js",
    expectedItemCount: 1,
  });

  assert.deepEqual(result, { itemCount: 1, injected: true });
  assert.equal(JSON.parse(await fs.readFile(outputPath, "utf8")).length, 1);
  assert.match(await fs.readFile(indexPath, "utf8"), /\/test\/debug-tools\.js/);
});
