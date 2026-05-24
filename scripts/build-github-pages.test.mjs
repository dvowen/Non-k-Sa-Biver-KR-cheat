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
    '<script src="/202604testtes004v6/debug-tools.js"></script>',
    'const BASE_PATH = "/202604testtes004v6";',
    'fetch("/202604testtes004v6/debug-items.json")',
  ].join("\n");

  assert.equal(
    rewriteGithubPagesPaths(input, {
      localBasePath: "/202604testtes004v6",
      githubPagesBasePath: "/Non-k-Sa-Biver",
    }),
    [
      '<script src="/Non-k-Sa-Biver/202604testtes004v6/debug-tools.js"></script>',
      'const BASE_PATH = "/Non-k-Sa-Biver/202604testtes004v6";',
      'fetch("/Non-k-Sa-Biver/202604testtes004v6/debug-items.json")',
    ].join("\n"),
  );
});

test("rewriteGithubPagesPaths defaults to the KR cheat repository base path", () => {
  assert.equal(
    rewriteGithubPagesPaths('fetch("/202604testtes004v6/debug-items.json")'),
    'fetch("/Non-k-Sa-Biver-KR-cheat/202604testtes004v6/debug-items.json")',
  );
});

test("rewriteGithubPagesPaths does not rewrite external source URLs", () => {
  assert.equal(
    rewriteGithubPagesPaths('href="https://example.com/202604testtes004v6/"'),
    'href="https://example.com/202604testtes004v6/"',
  );
});

test("buildGithubPages creates dist with rewritten text assets and root redirect", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "github-pages-build-"));
  const sourceDir = path.join(tempDir, "site");
  const distDir = path.join(tempDir, "dist");
  await fs.mkdir(path.join(sourceDir, "202604testtes004v6", "_next", "static"), { recursive: true });
  await fs.writeFile(
    path.join(sourceDir, "202604testtes004v6", "index.html"),
    '<script src="/202604testtes004v6/_next/static/app.js"></script>',
  );
  await fs.writeFile(
    path.join(sourceDir, "202604testtes004v6", "_next", "static", "app.js"),
    'const BASE_PATH="/202604testtes004v6";',
  );
  await fs.writeFile(path.join(sourceDir, "202604testtes004v6", "favicon.ico"), "ico");

  const result = await buildGithubPages({
    sourceDir,
    distDir,
    githubPagesBasePath: "/Non-k-Sa-Biver",
  });

  assert.equal(result.rewrittenFiles, 2);
  assert.equal(
    await fs.readFile(path.join(distDir, "202604testtes004v6", "index.html"), "utf8"),
    '<script src="/Non-k-Sa-Biver/202604testtes004v6/_next/static/app.js"></script>',
  );
  assert.equal(
    await fs.readFile(path.join(distDir, "202604testtes004v6", "_next", "static", "app.js"), "utf8"),
    'const BASE_PATH="/Non-k-Sa-Biver/202604testtes004v6";',
  );
  assert.match(await fs.readFile(path.join(distDir, "index.html"), "utf8"), /202604testtes004v6\//);
  assert.equal(await fs.readFile(path.join(distDir, ".nojekyll"), "utf8"), "");
});
