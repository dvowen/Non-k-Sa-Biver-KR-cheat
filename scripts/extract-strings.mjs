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

function decodeJsString(raw) {
  return raw
    .replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\b/g, "\b")
    .replace(/\\f/g, "\f")
    .replace(/\\v/g, "\v")
    .replace(/\\0/g, "\0")
    .replace(/\\(["'`\\])/g, "$1");
}

function lineForIndex(lineStarts, index) {
  let low = 0;
  let high = lineStarts.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (lineStarts[mid] <= index) low = mid + 1;
    else high = mid - 1;
  }
  return high + 1;
}

function lineStartsFor(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i += 1) {
    if (text.charCodeAt(i) === 10) starts.push(i + 1);
  }
  return starts;
}

function shouldKeep(value) {
  const trimmed = value.trim();
  if (trimmed.length < 2) return false;
  if (trimmed.length > 400) return false;
  if (!/[A-Za-z\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/.test(trimmed)) return false;
  if (/^(?:[A-Za-z_$][\w$]*|[A-Z0-9_:-]+)$/.test(trimmed) && trimmed.length < 18) return false;
  if (/^(?:https?:|data:|\/|\.\/|static\/|_next\/)/.test(trimmed)) return false;
  if (/\.(?:js|css|png|jpe?g|gif|webp|woff2?|ico|map)$/i.test(trimmed)) return false;
  if (/^[a-f0-9]{12,}$/i.test(trimmed)) return false;
  if (/^[\w-]+_[\w-]+__[A-Za-z0-9_-]+$/.test(trimmed)) return false;
  return true;
}

function isLikelyTranslatable(value) {
  const trimmed = value.trim();
  if (!shouldKeep(trimmed)) return false;
  if (/[.!?。！？:：,， ]/.test(trimmed)) return true;
  if (/[A-Za-z][a-z]+[A-Za-z]/.test(trimmed)) return true;
  if (/[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/.test(trimmed)) return true;
  return trimmed.length >= 8 && /[A-Za-z]/.test(trimmed);
}

function extractFromFile(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const rel = path.relative(root, filePath);
  const lineStarts = lineStartsFor(text);
  const strings = [];
  const pattern = /(["'`])((?:\\.|(?!\1)[\s\S]){1,400})\1/g;

  let match;
  while ((match = pattern.exec(text)) !== null) {
    const quote = match[1];
    const raw = match[2];
    if (quote === "`" && raw.includes("${")) continue;
    const value = decodeJsString(raw);
    if (!shouldKeep(value)) continue;
    strings.push({
      file: rel,
      line: lineForIndex(lineStarts, match.index),
      quote,
      value: value.trim(),
    });
  }

  return strings;
}

const files = walk(rawDir);
const all = files.flatMap(extractFromFile);

const byValue = new Map();
for (const item of all) {
  const existing = byValue.get(item.value);
  if (existing) {
    existing.count += 1;
    existing.locations.push(`${item.file}:${item.line}`);
  } else {
    byValue.set(item.value, {
      value: item.value,
      count: 1,
      locations: [`${item.file}:${item.line}`],
      likelyTranslatable: isLikelyTranslatable(item.value),
    });
  }
}

const unique = [...byValue.values()].sort((a, b) => a.value.localeCompare(b.value));
const candidates = unique.filter((item) => item.likelyTranslatable);

function tsvEscape(value) {
  return String(value).replace(/\t/g, " ").replace(/\r?\n/g, "\\n");
}

fs.writeFileSync(path.join(outDir, "all-strings.json"), JSON.stringify({ files: files.map((file) => path.relative(root, file)), strings: all }, null, 2));
fs.writeFileSync(path.join(outDir, "unique-strings.json"), JSON.stringify(unique, null, 2));
fs.writeFileSync(
  path.join(outDir, "translation-candidates.tsv"),
  ["source\tkorean\tcount\tlocations", ...candidates.map((item) => `${tsvEscape(item.value)}\t\t${item.count}\t${item.locations.slice(0, 8).join(", ")}`)].join("\n") + "\n",
);
fs.writeFileSync(
  path.join(outDir, "translation-candidates.md"),
  ["# Translation Candidates", "", `- Candidate strings: ${candidates.length}`, `- Unique extracted strings: ${unique.length}`, "", "| Source | Korean | Count | Locations |", "| --- | --- | ---: | --- |", ...candidates.map((item) => `| ${tsvEscape(item.value)} |  | ${item.count} | ${item.locations.slice(0, 4).join("<br>")} |`)].join("\n") + "\n",
);

console.log(`files=${files.length}`);
console.log(`strings=${all.length}`);
console.log(`unique=${unique.length}`);
console.log(`candidates=${candidates.length}`);
