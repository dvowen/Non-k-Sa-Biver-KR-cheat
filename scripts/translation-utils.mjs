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
  const tokenPattern = /\$\{[^}\r\n]+\}|\{[A-Za-z0-9_]+\}|\[(?:wait(?::[0-9.]+)?|se:[A-Za-z0-9_]+)\]/g;
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

export function toJsEscapedText(value, quote = '"') {
  const normalized = value.replaceAll("\\n", "\n").replaceAll("\\r", "\r");
  let escaped = normalized
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "\\r");

  if (quote) {
    escaped = escaped.replaceAll(quote, `\\${quote}`);
  }

  return escaped;
}

export function jsStringLiteralPattern(source) {
  const doubleQuoted = `"${escapeRegExp(toJsEscapedText(source, '"'))}"`;
  const singleQuoted = `'${escapeRegExp(toJsEscapedText(source, "'"))}'`;
  const templateQuoted = `\`${escapeRegExp(toJsEscapedText(source, "`"))}\``;
  return new RegExp(`${doubleQuoted}|${singleQuoted}|${templateQuoted}`, "g");
}

export function isFragmentTranslation(row) {
  return /\b(fragment|partial)\b/i.test(`${row.context ?? ""} ${row.note ?? ""}`);
}

export function jsEscapedFragmentPattern(source) {
  return new RegExp(escapeRegExp(toJsEscapedText(source, "")), "g");
}

function toRawTemplateText(value) {
  return value.replaceAll("\\n", "\n").replaceAll("\\r", "\r");
}

export function rawTemplateFragmentPattern(source) {
  return new RegExp(escapeRegExp(toRawTemplateText(source)), "g");
}

export function rawDynamicTemplateLiteralPattern(source) {
  return new RegExp(`\`${escapeRegExp(toRawTemplateText(source))}\``, "g");
}

function toRawTemplateLiteral(value) {
  return `\`${toRawTemplateText(value).replaceAll("`", "\\`")}\``;
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
    if (row.source === row.korean) continue;
    output = output.replace(jsStringLiteralPattern(row.source), `"${toJsEscapedText(row.korean)}"`);
    if (row.source.includes("${")) {
      output = output.replace(
        rawDynamicTemplateLiteralPattern(row.source),
        () => toRawTemplateLiteral(row.korean),
      );
    }
  }
  for (const row of translations) {
    if (row.source === row.korean || !isFragmentTranslation(row)) continue;
    output = output.replace(jsEscapedFragmentPattern(row.source), toJsEscapedText(row.korean, ""));
    output = output.replace(rawTemplateFragmentPattern(row.source), toRawTemplateText(row.korean));
  }
  return output;
}

export function countReplaceableJsStringLiterals(input, translations) {
  let total = 0;
  for (const row of translations) {
    if (row.source === row.korean) continue;
    total += input.match(jsStringLiteralPattern(row.source))?.length ?? 0;
    if (row.source.includes("${")) {
      total += input.match(rawDynamicTemplateLiteralPattern(row.source))?.length ?? 0;
    }
    if (isFragmentTranslation(row)) {
      const escapedPattern = jsEscapedFragmentPattern(row.source);
      const rawPattern = rawTemplateFragmentPattern(row.source);
      total += input.match(escapedPattern)?.length ?? 0;
      if (rawPattern.source !== escapedPattern.source) {
        total += input.match(rawPattern)?.length ?? 0;
      }
    }
  }
  return total;
}
