import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { localPathForRequest } from "./serve-local.mjs";

test("root requests resolve to the current version directory", () => {
  const result = localPathForRequest("/");

  assert.equal(result.pathname, "/");
  assert.equal(
    result.filePath,
    path.resolve("site/202605testtest050v7/index.html"),
  );
});
