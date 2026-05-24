import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ensureScriptTag } from "./debug-tools-utils.mjs";

const INDEX_PATH = path.resolve("site/202604testtes004v6/index.html");
const SCRIPT_SRC = "/202604testtes004v6/debug-tools.js";

export async function injectDebugTools({
  indexPath = INDEX_PATH,
  scriptSrc = SCRIPT_SRC,
} = {}) {
  const input = await fs.readFile(indexPath, "utf8");
  const output = ensureScriptTag(input, scriptSrc);
  if (output !== input) {
    await fs.writeFile(indexPath, output);
    return true;
  }
  return false;
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
