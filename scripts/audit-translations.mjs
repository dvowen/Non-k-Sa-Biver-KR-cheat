import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { SITE_DIR } from "./version-config.mjs";

const JAPANESE_PATTERN = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー々〆〤][\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー々〆〤A-Za-z0-9！？。、，・：:（）()「」『』%％＋+\-〜~…!?\s]{0,120}/gu;
const NON_PLAYER_FACING_ALLOWLIST = new Set([
  "縦方向のスクロールを許可",
]);

function clean(value) {
  return value
    .replace(/\\n/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[,.:;|+\-()[\]{}"'`\\]+/, "")
    .replace(/[,.:;|+\-()[\]{}"'`\\]+$/, "")
    .trim();
}

export function findJapaneseSnippets(source) {
  const found = new Set();
  for (const match of source.matchAll(JAPANESE_PATTERN)) {
    const value = clean(match[0]);
    if (value.length < 2 || NON_PLAYER_FACING_ALLOWLIST.has(value)) continue;
    found.add(value);
  }
  return [...found].sort((a, b) => a.localeCompare(b));
}

async function listJsFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listJsFiles(filePath);
    if (entry.isFile() && entry.name.endsWith(".js")) return [filePath];
    return [];
  }));
  return nested.flat().sort();
}

export async function auditTranslatedSite({ siteDir = SITE_DIR } = {}) {
  const findings = [];
  for (const file of await listJsFiles(siteDir)) {
    const source = await fs.readFile(file, "utf8");
    for (const value of findJapaneseSnippets(source)) {
      findings.push({ file: path.relative(process.cwd(), file), value });
    }
  }
  return findings;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  auditTranslatedSite()
    .then((findings) => {
      for (const finding of findings) {
        console.error(`${finding.file}\t${finding.value}`);
      }
      console.log(`untranslated_japanese=${findings.length}`);
      if (findings.length > 0) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}

