import { promises as fs } from "node:fs";
import path from "node:path";
import { parseTranslationTsv, mergeTranslationRows } from "./translation-utils.mjs";

const TRANSLATE_DIR = path.resolve("translate");
const OUTPUT_FILE = path.join(TRANSLATE_DIR, "translation-memory.json");

async function collectTsvFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });

  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectTsvFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".tsv")) {
      files.push(fullPath);
    }
  }
  return files.sort();
}

async function main() {
  const files = await collectTsvFiles(TRANSLATE_DIR);
  const rows = [];

  for (const file of files) {
    const input = await fs.readFile(file, "utf8");
    for (const row of parseTranslationTsv(input)) {
      rows.push({ ...row, file: path.relative(process.cwd(), file) });
    }
  }

  const merged = mergeTranslationRows(rows);
  await fs.mkdir(TRANSLATE_DIR, { recursive: true });
  await fs.writeFile(OUTPUT_FILE, `${JSON.stringify(merged, null, 2)}\n`);

  console.log(`Merged ${merged.length} translations from ${files.length} TSV files.`);
  console.log(path.relative(process.cwd(), OUTPUT_FILE));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
