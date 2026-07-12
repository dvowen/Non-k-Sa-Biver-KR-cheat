import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  captureUpstream,
  extractCorePaths,
} from "./capture-upstream.mjs";

const BASE_PATH = "/202605testtest050v7";

test("extractCorePaths finds direct and lazy Next.js build files", () => {
  const source = `
    <script src="${BASE_PATH}/_next/static/chunks/entry.js"></script>
    <link rel="stylesheet" href="${BASE_PATH}/_next/static/chunks/app.css">
    <link rel="preload" href="${BASE_PATH}/_next/static/media/font.woff2">
    <link rel="icon" href="${BASE_PATH}/favicon.ico?hash">
    const lazy = "096a45b60b7c4b91.js";
  `;

  assert.deepEqual(extractCorePaths(source, { basePath: BASE_PATH }), [
    `${BASE_PATH}/_next/static/chunks/096a45b60b7c4b91.js`,
    `${BASE_PATH}/_next/static/chunks/app.css`,
    `${BASE_PATH}/_next/static/chunks/entry.js`,
    `${BASE_PATH}/_next/static/media/font.woff2`,
    `${BASE_PATH}/favicon.ico`,
  ]);
});

test("captureUpstream follows lazy chunks and mirrors core files", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "capture-upstream-"));
  const rawDir = path.join(tempDir, "raw");
  const siteDir = path.join(tempDir, "site", BASE_PATH.slice(1));
  const bodies = new Map([
    [`${BASE_PATH}/`, `<script src="${BASE_PATH}/_next/static/chunks/entry.js"></script><link rel="icon" href="${BASE_PATH}/favicon.ico">`],
    [`${BASE_PATH}/_next/static/chunks/entry.js`, `const lazy="096a45b60b7c4b91.js";`],
    [`${BASE_PATH}/_next/static/chunks/096a45b60b7c4b91.js`, `const image="${BASE_PATH}/assets/cg/new.png";`],
    [`${BASE_PATH}/favicon.ico`, "icon"],
  ]);
  const requested = [];
  const fetchImpl = async (url) => {
    const pathname = new URL(url).pathname;
    requested.push(pathname);
    const body = bodies.get(pathname);
    return new Response(body ?? "missing", { status: body === undefined ? 404 : 200 });
  };

  const result = await captureUpstream({
    fetchImpl,
    rawDir,
    siteDir,
    upstreamOrigin: "https://example.test",
    basePath: BASE_PATH,
  });

  assert.equal(result.chunkCount, 2);
  assert.deepEqual(requested.sort(), [...bodies.keys()].sort());
  assert.match(await fs.readFile(path.join(rawDir, "index.html"), "utf8"), /entry\.js/);
  assert.equal(await fs.readFile(path.join(rawDir, "chunks", "096a45b60b7c4b91.js"), "utf8"), bodies.get(`${BASE_PATH}/_next/static/chunks/096a45b60b7c4b91.js`));
  assert.equal(await fs.readFile(path.join(siteDir, "_next", "static", "chunks", "entry.js"), "utf8"), bodies.get(`${BASE_PATH}/_next/static/chunks/entry.js`));
  assert.equal(await fs.readFile(path.join(siteDir, "favicon.ico"), "utf8"), "icon");
});

test("captureUpstream rejects a missing core file", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "capture-upstream-error-"));
  const fetchImpl = async (url) => {
    const pathname = new URL(url).pathname;
    if (pathname === `${BASE_PATH}/`) {
      return new Response(`<script src="${BASE_PATH}/_next/static/chunks/missing.js"></script>`);
    }
    return new Response("missing", { status: 404 });
  };

  await assert.rejects(
    captureUpstream({
      fetchImpl,
      rawDir: path.join(tempDir, "raw"),
      siteDir: path.join(tempDir, "site"),
      upstreamOrigin: "https://example.test",
      basePath: BASE_PATH,
    }),
    /HTTP 404.*missing\.js/,
  );
});
