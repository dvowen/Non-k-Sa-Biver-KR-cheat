import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { extractDebugItems } from "./debug-tools-utils.mjs";
import { SITE_DIR } from "./version-config.mjs";

const DEFAULT_CHUNKS_DIR = path.join(SITE_DIR, "_next", "static", "chunks");
const DEFAULT_OUTPUT_PATH = path.join(SITE_DIR, "debug-items.json");

async function listJsFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
    .map((entry) => path.join(dir, entry.name))
    .sort();
}

export async function generateDebugItems({
  chunksDir = DEFAULT_CHUNKS_DIR,
  outputPath = DEFAULT_OUTPUT_PATH,
  expectedCount = 44,
} = {}) {
  const itemsById = new Map();
  for (const file of await listJsFiles(chunksDir)) {
    const source = await fs.readFile(file, "utf8");
    for (const item of extractDebugItems(source)) {
      if (!itemsById.has(item.id)) itemsById.set(item.id, item);
    }
  }

  const items = [...itemsById.values()]
    .sort((a, b) => a.name.localeCompare(b.name, "ko") || a.id.localeCompare(b.id));
  if (items.length !== expectedCount) {
    throw new Error(`Expected ${expectedCount} debug items, found ${items.length}.`);
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(items, null, 2)}\n`);
  return items.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  generateDebugItems()
    .then((count) => console.log(`Generated ${count} debug items.`))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
