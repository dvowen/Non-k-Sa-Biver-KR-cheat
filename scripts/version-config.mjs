import path from "node:path";

export const UPSTREAM_ORIGIN = "https://funa-funa.sakura.ne.jp";
export const UPSTREAM_BASE_PATH = "/202605testtest050v7";
export const SITE_VERSION_DIR = UPSTREAM_BASE_PATH.slice(1);
export const GITHUB_PAGES_BASE_PATH = "/Non-k-Sa-Biver-KR";
export const RAW_DIR = path.resolve("raw");
export const SITE_ROOT_DIR = path.resolve("site");
export const SITE_DIR = path.join(SITE_ROOT_DIR, SITE_VERSION_DIR);

