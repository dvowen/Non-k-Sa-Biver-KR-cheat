import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  GITHUB_PAGES_BASE_PATH,
  SITE_ROOT_DIR,
  SITE_VERSION_DIR,
  UPSTREAM_BASE_PATH,
} from "./version-config.mjs";

const SOURCE_DIR = SITE_ROOT_DIR;
const DIST_DIR = path.resolve("dist");
const LOCAL_BASE_PATH = UPSTREAM_BASE_PATH;
const DEFAULT_GITHUB_PAGES_BASE_PATH = GITHUB_PAGES_BASE_PATH;
const TEXT_EXTENSIONS = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".map",
  ".svg",
  ".txt",
  ".webmanifest",
  ".xml",
]);

function normalizePathPrefix(value) {
  const trimmed = String(value || "").trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function rewriteGithubPagesPaths(
  content,
  {
    localBasePath = LOCAL_BASE_PATH,
    githubPagesBasePath = DEFAULT_GITHUB_PAGES_BASE_PATH,
  } = {},
) {
  const localBase = normalizePathPrefix(localBasePath);
  const pagesBase = normalizePathPrefix(githubPagesBasePath);
  const pattern = new RegExp(`(?<![.A-Za-z0-9_-])${escapeRegExp(localBase)}`, "g");
  return content.replace(pattern, `${pagesBase}${localBase}`);
}

async function listFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(filePath);
    if (entry.isFile()) return [filePath];
    return [];
  }));
  return files.flat().sort();
}

function isTextAsset(filePath) {
  return TEXT_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

async function rewriteCopiedFiles(distDir, options) {
  const files = await listFiles(distDir);
  let rewrittenFiles = 0;

  for (const file of files) {
    if (!isTextAsset(file)) continue;
    const input = await fs.readFile(file, "utf8");
    const output = rewriteGithubPagesPaths(input, options);
    if (output === input) continue;
    await fs.writeFile(file, output);
    rewrittenFiles += 1;
  }

  return rewrittenFiles;
}

async function writeRootRedirect(distDir) {
  const html = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="0; url=./${SITE_VERSION_DIR}/" />
    <title>Non-k Sa-BIVER</title>
  </head>
  <body>
    <a href="./${SITE_VERSION_DIR}/">Non-k Sa-BIVER 열기</a>
  </body>
</html>
`;
  await fs.writeFile(path.join(distDir, "index.html"), html);
}

async function writeNoJekyll(distDir) {
  await fs.writeFile(path.join(distDir, ".nojekyll"), "");
}

export async function buildGithubPages({
  sourceDir = SOURCE_DIR,
  distDir = DIST_DIR,
  localBasePath = LOCAL_BASE_PATH,
  githubPagesBasePath = process.env.GITHUB_PAGES_BASE || DEFAULT_GITHUB_PAGES_BASE_PATH,
} = {}) {
  const options = { localBasePath, githubPagesBasePath };
  await fs.rm(distDir, { recursive: true, force: true });
  await fs.mkdir(distDir, { recursive: true });
  await fs.cp(
    path.join(sourceDir, SITE_VERSION_DIR),
    path.join(distDir, SITE_VERSION_DIR),
    { recursive: true },
  );
  const rewrittenFiles = await rewriteCopiedFiles(distDir, options);
  await writeRootRedirect(distDir);
  await writeNoJekyll(distDir);

  return {
    distDir,
    githubPagesBasePath: normalizePathPrefix(githubPagesBasePath),
    rewrittenFiles,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  buildGithubPages()
    .then((result) => {
      console.log(`Built GitHub Pages dist at ${path.relative(process.cwd(), result.distDir)}.`);
      console.log(`Base path: ${result.githubPagesBasePath}`);
      console.log(`Rewritten text files: ${result.rewrittenFiles}`);
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
