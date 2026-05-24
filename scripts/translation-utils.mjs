export function parseTranslationTsv(input) {
  const lines = input.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];

  const headers = lines[0].split("\t");
  return lines.slice(1).map((line) => {
    const cells = line.split("\t");
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
}

export function collectSpecialTokens(text) {
  const tokens = [];
  const tokenPattern = /\{[A-Za-z0-9_]+\}|\[(?:wait(?::[0-9.]+)?|se:[A-Za-z0-9_]+)\]/g;
  for (const match of text.matchAll(tokenPattern)) {
    tokens.push(match[0]);
  }
  return tokens;
}

export function validateTokenPreservation(source, korean) {
  for (const token of collectSpecialTokens(source)) {
    if (!korean.includes(token)) {
      throw new Error(`Missing token in translation: ${token}`);
    }
  }
}

export function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function toJsEscapedText(value) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "\\r")
    .replaceAll('"', '\\"');
}

export function jsStringLiteralPattern(source) {
  return new RegExp(`"${escapeRegExp(toJsEscapedText(source))}"`, "g");
}

export function mergeTranslationRows(rows) {
  const merged = new Map();
  for (const row of rows) {
    if (!row.source || !row.korean) continue;

    validateTokenPreservation(row.source, row.korean);

    const previous = merged.get(row.source);
    if (previous && previous.korean !== row.korean) {
      throw new Error(`Conflicting translation for source: ${row.source}`);
    }

    merged.set(row.source, {
      source: row.source,
      korean: row.korean,
      speaker: row.speaker ?? "",
      context: row.context ?? "",
      note: row.note ?? "",
    });
  }
  return [...merged.values()].sort((a, b) => b.source.length - a.source.length);
}

export function replaceJsStringLiterals(input, translations) {
  let output = input;
  for (const row of translations) {
    output = output.replace(jsStringLiteralPattern(row.source), `"${toJsEscapedText(row.korean)}"`);
  }
  return output;
}
