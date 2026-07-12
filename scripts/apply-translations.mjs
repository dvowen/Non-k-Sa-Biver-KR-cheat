import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  replaceJsStringLiterals,
  countReplaceableJsStringLiterals,
} from "./translation-utils.mjs";
import { SITE_DIR } from "./version-config.mjs";

const TRANSLATION_MEMORY = path.resolve("translate/translation-memory.json");
const RAW_CHUNKS_DIR = path.resolve("raw/chunks");
export const DEFAULT_CHUNKS_DIR = path.join(SITE_DIR, "_next", "static", "chunks");

export async function listChunkFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
    .map((entry) => path.join(dir, entry.name))
    .sort();
}

export async function restoreRawJsChunks(rawDir, targetDir) {
  const files = await listChunkFiles(rawDir);
  await fs.mkdir(targetDir, { recursive: true });

  for (const file of files) {
    await fs.copyFile(file, path.join(targetDir, path.basename(file)));
  }

  return files.length;
}

async function main() {
  const translations = JSON.parse(await fs.readFile(TRANSLATION_MEMORY, "utf8"));
  const restored = await restoreRawJsChunks(RAW_CHUNKS_DIR, DEFAULT_CHUNKS_DIR);
  const files = await listChunkFiles(DEFAULT_CHUNKS_DIR);
  let total = 0;

  for (const file of files) {
    const input = await fs.readFile(file, "utf8");
    const count = countReplaceableJsStringLiterals(input, translations);
    if (count === 0) continue;

    const output = replaceJsStringLiterals(input, translations);
    await fs.writeFile(file, output);
    total += count;

    console.log(`${path.relative(process.cwd(), file)}: ${count}`);
  }

  console.log(`Restored ${restored} raw JS chunks.`);
  console.log(`Applied ${total} replacements from ${translations.length} translations.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
