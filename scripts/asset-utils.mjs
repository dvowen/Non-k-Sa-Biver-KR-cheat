import { UPSTREAM_BASE_PATH } from "./version-config.mjs";

export const BASE_PATH = UPSTREAM_BASE_PATH;

const KNOWN_UPSTREAM_MISSING_SUFFIXES = new Set([
  "/assets/A-01aaegao01.png",
  "/assets/A-01aanomal.png",
  "/assets/cg/test01.png",
  "/assets/icons/potion01.png",
  "/assets/ui/pattern.png",
]);

export function isKnownUpstreamMissingAsset(assetPath) {
  return [...KNOWN_UPSTREAM_MISSING_SUFFIXES].some((suffix) => assetPath.endsWith(suffix));
}

const ASSET_EXTENSIONS = [
  "woff2",
  "woff",
  "jpeg",
  "jpg",
  "png",
  "webp",
  "gif",
  "svg",
  "mp3",
  "ogg",
  "wav",
  "json",
  "ico",
];

const assetExtensionPattern = ASSET_EXTENSIONS.join("|");

function normalizeAssetPath(value) {
  if (!value) return null;

  let path = value.trim().replaceAll("\\/", "/");
  if (path.startsWith("http://") || path.startsWith("https://")) {
    const url = new URL(path);
    path = url.pathname;
  }

  if (path.startsWith(`${BASE_PATH}/assets/`) || path.startsWith(`${BASE_PATH}/_next/static/`)) {
    return path;
  }

  if (path.startsWith("/assets/")) {
    return `${BASE_PATH}${path}`;
  }

  return null;
}

function add(set, value) {
  const normalized = normalizeAssetPath(value);
  if (normalized) set.add(normalized);
}

function extractHelperCalls(source, set) {
  const helpers = [
    { name: "resolveNpcPortrait", prefix: `${BASE_PATH}/assets/entities/npc/portraits/` },
    { name: "resolveNpcSprite", prefix: `${BASE_PATH}/assets/entities/npc/spritesheets/` },
    { name: "resolveCgAsset", prefix: `${BASE_PATH}/assets/cg/` },
  ];

  for (const helper of helpers) {
    const pattern = new RegExp(`${helper.name}\\\\?\\)?\\(["']([^"']+\\.(${assetExtensionPattern}))["']\\)`, "gi");
    let match;
    while ((match = pattern.exec(source)) !== null) {
      const filename = match[1]
        .replace(/^\/?assets\//i, "")
        .replace(/^entities\/npc\/portraits\//i, "")
        .replace(/^entities\/npc\/spritesheets\//i, "")
        .replace(/^npc\//i, "")
        .replace(/^cg\//i, "");
      set.add(`${helper.prefix}${filename}`);
    }
  }
}

export function extractAssetPaths(source) {
  const found = new Set();

  const directPattern = new RegExp(
    `(?:${BASE_PATH.replaceAll("/", "\\/")})?\\/assets\\/[^"'\\\`)\\s,;]+\\.(${assetExtensionPattern})`,
    "gi",
  );
  let match;
  while ((match = directPattern.exec(source)) !== null) {
    add(found, match[0]);
  }

  const nextPattern = new RegExp(
    `${BASE_PATH.replaceAll("/", "\\/")}\\/_next\\/static\\/[^"'\\\`)\\s,;]+\\.(${assetExtensionPattern})`,
    "gi",
  );
  while ((match = nextPattern.exec(source)) !== null) {
    add(found, match[0]);
  }

  extractHelperCalls(source, found);

  return [...found].sort();
}

export function pathToSiteRelative(assetPath) {
  if (!assetPath.startsWith(`${BASE_PATH}/`)) {
    throw new Error(`Unexpected asset path outside ${BASE_PATH}: ${assetPath}`);
  }
  return assetPath.slice(1);
}
