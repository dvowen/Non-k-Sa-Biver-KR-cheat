import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const rawDir = path.join(root, "raw");
const outDir = path.join(root, "extracted");

fs.mkdirSync(outDir, { recursive: true });

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    if (/\.(html|js|css)$/i.test(entry.name)) return [fullPath];
    return [];
  });
}

function lineFor(text, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (text.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

function clean(value) {
  return value
    .replace(/\\n/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[,.:;|+\-()[\]{}"'`\\]+/, "")
    .replace(/[,.:;|+\-()[\]{}"'`\\]+$/, "")
    .trim();
}

function tsvEscape(value) {
  return String(value).replace(/\t/g, " ").replace(/\r?\n/g, "\\n");
}

const byValue = new Map();
const pattern = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー々〆〤][\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー々〆〤A-Za-z0-9！？。、，・：:（）()「」『』%％＋+\-〜~…!?\s]{0,120}/gu;

for (const file of walk(rawDir)) {
  const text = fs.readFileSync(file, "utf8");
  const rel = path.relative(root, file);
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const value = clean(match[0]);
    if (value.length < 2) continue;
    const location = `${rel}:${lineFor(text, match.index)}`;
    const existing = byValue.get(value);
    if (existing) {
      existing.count += 1;
      existing.locations.push(location);
    } else {
      byValue.set(value, { value, korean: "", count: 1, locations: [location] });
    }
  }
}

const entries = [...byValue.values()].sort((a, b) => {
  const fileA = a.locations[0] ?? "";
  const fileB = b.locations[0] ?? "";
  return fileA.localeCompare(fileB) || a.value.localeCompare(b.value);
});

fs.writeFileSync(
  path.join(outDir, "japanese-strings.tsv"),
  ["source\tkorean\tcount\tlocations", ...entries.map((entry) => `${tsvEscape(entry.value)}\t${tsvEscape(entry.korean)}\t${entry.count}\t${entry.locations.slice(0, 8).join(", ")}`)].join("\n") + "\n",
);

fs.writeFileSync(
  path.join(outDir, "japanese-strings.json"),
  JSON.stringify(entries, null, 2),
);

fs.writeFileSync(
  path.join(outDir, "japanese-strings.md"),
  ["# Japanese Strings", "", `- Unique Japanese snippets: ${entries.length}`, "", "| Source | Korean | Count | Locations |", "| --- | --- | ---: | --- |", ...entries.map((entry) => `| ${tsvEscape(entry.value)} |  | ${entry.count} | ${entry.locations.slice(0, 4).join("<br>")} |`)].join("\n") + "\n",
);

console.log(`japanese=${entries.length}`);
