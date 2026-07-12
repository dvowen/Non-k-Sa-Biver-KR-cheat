import fs from "node:fs";
import path from "node:path";
import { extractAssetPaths, pathToSiteRelative } from "./asset-utils.mjs";
import {
  RAW_DIR,
  SITE_ROOT_DIR,
  UPSTREAM_ORIGIN,
} from "./version-config.mjs";

const root = path.resolve(RAW_DIR, "..");
const rawDir = RAW_DIR;
const siteDir = SITE_ROOT_DIR;
const extractedDir = path.join(root, "extracted");
const upstreamOrigin = UPSTREAM_ORIGIN;
const concurrency = Number(process.env.CONCURRENCY || 6);
const retryCount = Number(process.env.RETRIES || 1);

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    if (/\.(html|js|css)$/i.test(entry.name)) return [fullPath];
    return [];
  });
}

function discoverAssets() {
  const files = walk(rawDir);
  const assets = new Set();
  const sources = new Map();

  for (const file of files) {
    const rel = path.relative(root, file);
    const source = fs.readFileSync(file, "utf8");
    for (const asset of extractAssetPaths(source)) {
      assets.add(asset);
      const refs = sources.get(asset) || [];
      refs.push(rel);
      sources.set(asset, refs);
    }
  }

  return [...assets].sort().map((asset) => ({
    path: asset,
    sources: [...new Set(sources.get(asset) || [])].sort(),
  }));
}

async function fetchAsset(assetPath, outputPath) {
  if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
    return { status: "cached", bytes: fs.statSync(outputPath).size };
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const url = `${upstreamOrigin}${assetPath}`;
  let lastError = null;

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        lastError = `HTTP ${response.status}`;
        continue;
      }
      const bytes = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(outputPath, bytes);
      return { status: "downloaded", bytes: bytes.length };
    } catch (error) {
      lastError = error?.message || String(error);
    }
  }

  return { status: "missing", error: lastError || "unknown error" };
}

async function runPool(items, worker) {
  const results = new Array(items.length);
  let next = 0;

  async function consume() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, consume));
  return results;
}

const assets = discoverAssets();
fs.mkdirSync(extractedDir, { recursive: true });
fs.writeFileSync(path.join(extractedDir, "asset-list.txt"), assets.map((asset) => asset.path).join("\n") + "\n");

let downloaded = 0;
let cached = 0;
let missing = 0;

const results = await runPool(assets, async (asset, index) => {
  const outputPath = path.join(siteDir, pathToSiteRelative(asset.path));
  const result = await fetchAsset(asset.path, outputPath);
  if (result.status === "downloaded") downloaded += 1;
  if (result.status === "cached") cached += 1;
  if (result.status === "missing") missing += 1;

  const n = String(index + 1).padStart(String(assets.length).length, " ");
  const status = result.status.padEnd(10, " ");
  console.log(`[${n}/${assets.length}] ${status} ${asset.path}`);

  return {
    ...asset,
    output: path.relative(root, outputPath),
    ...result,
  };
});

const manifest = {
  upstreamOrigin,
  generatedAt: new Date().toISOString(),
  total: results.length,
  downloaded,
  cached,
  missing,
  assets: results,
};

fs.writeFileSync(path.join(extractedDir, "asset-manifest.json"), JSON.stringify(manifest, null, 2));
fs.writeFileSync(
  path.join(extractedDir, "missing-assets.txt"),
  results.filter((asset) => asset.status === "missing").map((asset) => `${asset.path}\t${asset.error || ""}`).join("\n") + "\n",
);

console.log(`assets=${results.length}`);
console.log(`downloaded=${downloaded}`);
console.log(`cached=${cached}`);
console.log(`missing=${missing}`);

if (missing > 0) process.exitCode = 1;
