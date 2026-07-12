import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildGithubPages,
  rewriteGithubPagesPaths,
} from "./build-github-pages.mjs";

test("rewriteGithubPagesPaths prefixes absolute local app paths with repo base", () => {
  const input = [
    '<script src="/202605testtest050v7/_next/static/app.js"></script>',
    'const BASE_PATH = "/202605testtest050v7";',
    'location.href = "/202605testtest050v7/save-manager.html"',
  ].join("\n");

  assert.equal(
    rewriteGithubPagesPaths(input, {
      localBasePath: "/202605testtest050v7",
      githubPagesBasePath: "/Non-k-Sa-Biver",
    }),
    [
      '<script src="/Non-k-Sa-Biver/202605testtest050v7/_next/static/app.js"></script>',
      'const BASE_PATH = "/Non-k-Sa-Biver/202605testtest050v7";',
      'location.href = "/Non-k-Sa-Biver/202605testtest050v7/save-manager.html"',
    ].join("\n"),
  );
});

test("rewriteGithubPagesPaths defaults to the cheat repository base path", () => {
  assert.equal(
    rewriteGithubPagesPaths('location.href = "/202605testtest050v7/save-manager.html"'),
    'location.href = "/Non-k-Sa-Biver-KR-cheat/202605testtest050v7/save-manager.html"',
  );
});

test("rewriteGithubPagesPaths does not rewrite external source URLs", () => {
  assert.equal(
    rewriteGithubPagesPaths('href="https://example.com/202605testtest050v7/"'),
    'href="https://example.com/202605testtest050v7/"',
  );
});

test("buildGithubPages creates dist with rewritten text assets and root redirect", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "github-pages-build-"));
  const sourceDir = path.join(tempDir, "site");
  const distDir = path.join(tempDir, "dist");
  await fs.mkdir(path.join(sourceDir, "202604testtes004v6"), { recursive: true });
  await fs.writeFile(path.join(sourceDir, "202604testtes004v6", "stale.html"), "stale");
  await fs.mkdir(path.join(sourceDir, "202605testtest050v7", "_next", "static"), { recursive: true });
  await fs.writeFile(
    path.join(sourceDir, "202605testtest050v7", "index.html"),
    '<script src="/202605testtest050v7/_next/static/app.js"></script>',
  );
  await fs.writeFile(
    path.join(sourceDir, "202605testtest050v7", "_next", "static", "app.js"),
    'const BASE_PATH="/202605testtest050v7";',
  );
  await fs.writeFile(path.join(sourceDir, "202605testtest050v7", "favicon.ico"), "ico");

  const result = await buildGithubPages({
    sourceDir,
    distDir,
    githubPagesBasePath: "/Non-k-Sa-Biver",
  });

  assert.equal(result.rewrittenFiles, 2);
  assert.equal(
    await fs.readFile(path.join(distDir, "202605testtest050v7", "index.html"), "utf8"),
    '<script src="/Non-k-Sa-Biver/202605testtest050v7/_next/static/app.js"></script>',
  );
  assert.equal(
    await fs.readFile(path.join(distDir, "202605testtest050v7", "_next", "static", "app.js"), "utf8"),
    'const BASE_PATH="/Non-k-Sa-Biver/202605testtest050v7";',
  );
  assert.match(await fs.readFile(path.join(distDir, "index.html"), "utf8"), /202605testtest050v7\//);
  assert.equal(await fs.readFile(path.join(distDir, ".nojekyll"), "utf8"), "");
  await assert.rejects(fs.access(path.join(distDir, "202604testtes004v6")));
});
