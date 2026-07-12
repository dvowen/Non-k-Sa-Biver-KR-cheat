import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ensureScriptTag } from "./debug-tools-utils.mjs";
import { SITE_DIR, UPSTREAM_BASE_PATH } from "./version-config.mjs";

const DEFAULT_INDEX_PATH = path.join(SITE_DIR, "index.html");
const DEFAULT_SCRIPT_SRC = `${UPSTREAM_BASE_PATH}/debug-tools.js`;

export async function injectDebugTools({
  indexPath = DEFAULT_INDEX_PATH,
  scriptSrc = DEFAULT_SCRIPT_SRC,
} = {}) {
  const input = await fs.readFile(indexPath, "utf8");
  const output = ensureScriptTag(input, scriptSrc);
  if (output === input) return false;
  await fs.writeFile(indexPath, output);
  return true;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  injectDebugTools()
    .then((changed) => {
      console.log(changed ? "Injected debug tools script." : "Debug tools script already present.");
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
