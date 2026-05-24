import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { extractDebugItems } from "./debug-tools-utils.mjs";

const CHUNK_PATH = path.resolve("site/202604testtes004v6/_next/static/chunks/b56bfbf49ed29e1c.js");
const OUTPUT_PATH = path.resolve("site/202604testtes004v6/debug-items.json");

export async function generateDebugItems({
  chunkPath = CHUNK_PATH,
  outputPath = OUTPUT_PATH,
} = {}) {
  const chunkText = await fs.readFile(chunkPath, "utf8");
  const items = extractDebugItems(chunkText);

  if (items.length < 10) {
    throw new Error(`Expected at least 10 debug items, found ${items.length}.`);
  }

  await fs.writeFile(outputPath, `${JSON.stringify(items, null, 2)}\n`);
  return items.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  generateDebugItems()
    .then((count) => {
      console.log(`Generated ${count} debug items.`);
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
