import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  RAW_DIR,
  SITE_DIR,
  UPSTREAM_BASE_PATH,
  UPSTREAM_ORIGIN,
} from "./version-config.mjs";

function normalizeBasePath(value) {
  const normalized = String(value || "").trim().replace(/\/+$/, "");
  if (!normalized.startsWith("/")) {
    throw new Error(`Base path must start with /: ${value}`);
  }
  return normalized;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractCorePaths(source, { basePath = UPSTREAM_BASE_PATH } = {}) {
  const base = normalizeBasePath(basePath);
  const escapedBase = escapeRegExp(base);
  const found = new Set();
  const directPattern = new RegExp(
    `${escapedBase}/_next/static/(?:chunks|media)/[^"'\\\`)\\s,;?]+\\.(?:js|css|woff2?|map)`,
    "g",
  );

  for (const match of source.matchAll(directPattern)) {
    found.add(match[0]);
  }

  const faviconPattern = new RegExp(`${escapedBase}/favicon\\.ico(?:\\?[^"'\\s>]*)?`, "g");
  for (const match of source.matchAll(faviconPattern)) {
    found.add(`${base}/favicon.ico`);
  }

  for (const match of source.matchAll(/(?<![A-Za-z0-9_-])([a-f0-9]{16}\.js)(?![A-Za-z0-9_-])/g)) {
    found.add(`${base}/_next/static/chunks/${match[1]}`);
  }

  return [...found].sort();
}

function outputPaths(pathname, { basePath, rawDir, siteDir }) {
  if (pathname === `${basePath}/`) {
    return [path.join(rawDir, "index.html"), path.join(siteDir, "index.html")];
  }
  if (pathname === `${basePath}/favicon.ico`) {
    return [path.join(rawDir, "favicon.ico"), path.join(siteDir, "favicon.ico")];
  }

  const chunkPrefix = `${basePath}/_next/static/chunks/`;
  if (pathname.startsWith(chunkPrefix)) {
    const filename = path.basename(pathname);
    const rawSubdir = filename.endsWith(".css") ? "css" : "chunks";
    return [
      path.join(rawDir, rawSubdir, filename),
      path.join(siteDir, "_next", "static", "chunks", filename),
    ];
  }

  const mediaPrefix = `${basePath}/_next/static/media/`;
  if (pathname.startsWith(mediaPrefix)) {
    return [path.join(siteDir, "_next", "static", "media", path.basename(pathname))];
  }

  throw new Error(`Unsupported core path: ${pathname}`);
}

async function writeAll(paths, bytes) {
  for (const outputPath of paths) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, bytes);
  }
}

async function resetCoreCapture({ rawDir, siteDir }) {
  const corePaths = [
    path.join(rawDir, "chunks"),
    path.join(rawDir, "css"),
    path.join(rawDir, "index.html"),
    path.join(rawDir, "favicon.ico"),
    path.join(siteDir, "_next", "static", "chunks"),
    path.join(siteDir, "_next", "static", "media"),
    path.join(siteDir, "index.html"),
    path.join(siteDir, "favicon.ico"),
  ];

  await Promise.all(corePaths.map((corePath) => fs.rm(corePath, { force: true, recursive: true })));
}

export async function captureUpstream({
  fetchImpl = fetch,
  rawDir = RAW_DIR,
  siteDir = SITE_DIR,
  upstreamOrigin = UPSTREAM_ORIGIN,
  basePath = UPSTREAM_BASE_PATH,
} = {}) {
  const base = normalizeBasePath(basePath);
  await resetCoreCapture({ rawDir, siteDir });
  const queue = [`${base}/`];
  const visited = new Set();

  while (queue.length > 0) {
    const pathname = queue.shift();
    if (visited.has(pathname)) continue;
    visited.add(pathname);

    const response = await fetchImpl(`${upstreamOrigin}${pathname}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} while fetching ${pathname}`);
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    await writeAll(outputPaths(pathname, { basePath: base, rawDir, siteDir }), bytes);

    if (/\.(?:html|js|css)$/.test(pathname) || pathname.endsWith("/")) {
      const source = bytes.toString("utf8");
      for (const discovered of extractCorePaths(source, { basePath: base })) {
        if (!visited.has(discovered)) queue.push(discovered);
      }
    }
  }

  return {
    files: visited.size,
    chunkCount: [...visited].filter((pathname) => pathname.endsWith(".js")).length,
    paths: [...visited].sort(),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  captureUpstream()
    .then((result) => {
      console.log(`Captured ${result.files} core files (${result.chunkCount} JavaScript chunks).`);
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
