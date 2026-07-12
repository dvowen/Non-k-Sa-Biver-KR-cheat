export function decodeJsString(value) {
  return JSON.parse(`"${value}"`);
}

export function extractDebugItems(chunkText) {
  const itemPattern =
    /([A-Za-z0-9_]+):\{id:"((?:\\.|[^"\\])*)",name:"((?:\\.|[^"\\])*)",description:"((?:\\.|[^"\\])*)",effectType:"((?:\\.|[^"\\])*)"[\s\S]*?price:([0-9.e+-]+)/g;
  const items = [];
  const seen = new Set();

  for (const match of chunkText.matchAll(itemPattern)) {
    const [, , id, name, description, effectType, priceText] = match;
    const decodedId = decodeJsString(id);
    if (seen.has(decodedId)) continue;
    seen.add(decodedId);

    items.push({
      id: decodedId,
      name: decodeJsString(name),
      description: decodeJsString(description),
      effectType: decodeJsString(effectType),
      price: Number(priceText),
    });
  }

  return items
    .filter((item) => item.id && item.id !== "gold_coin" && item.id === item.id.trim())
    .sort((a, b) => a.name.localeCompare(b.name, "ko") || a.id.localeCompare(b.id));
}

export function ensureScriptTag(html, scriptSrc) {
  if (html.includes(`src="${scriptSrc}"`) || html.includes(`src='${scriptSrc}'`)) {
    return html;
  }

  const tag = `<script src="${scriptSrc}" defer></script>`;
  if (html.includes("</body>")) {
    return html.replace("</body>", `${tag}</body>`);
  }

  return `${html}\n${tag}\n`;
}
