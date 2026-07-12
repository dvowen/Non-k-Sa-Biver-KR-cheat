import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { injectDebugTools } from "./inject-debug-tools.mjs";

test("injectDebugTools adds the current version script idempotently", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "inject-debug-"));
  const indexPath = path.join(tempDir, "index.html");
  const scriptSrc = "/202605testtest050v7/debug-tools.js";
  await fs.writeFile(indexPath, "<html><body></body></html>");

  assert.equal(await injectDebugTools({ indexPath, scriptSrc }), true);
  assert.equal(await injectDebugTools({ indexPath, scriptSrc }), false);
  assert.equal((await fs.readFile(indexPath, "utf8")).match(/debug-tools\.js/g)?.length, 1);
});
