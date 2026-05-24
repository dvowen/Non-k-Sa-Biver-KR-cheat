import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { injectDebugTools } from "./inject-debug-tools.mjs";

test("injectDebugTools inserts the runtime helper once", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "inject-debug-"));
  const indexPath = path.join(tempDir, "index.html");
  await fs.writeFile(indexPath, "<html><body><main></main></body></html>");

  assert.equal(await injectDebugTools({ indexPath, scriptSrc: "/debug-tools.js" }), true);
  assert.equal(await injectDebugTools({ indexPath, scriptSrc: "/debug-tools.js" }), false);

  const html = await fs.readFile(indexPath, "utf8");
  assert.equal(html.match(/debug-tools\.js/g)?.length, 1);
  assert.match(html, /<script src="\/debug-tools\.js" defer><\/script><\/body>/);
});
