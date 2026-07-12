import path from "node:path";
import { pathToFileURL } from "node:url";
import { generateDebugItems } from "./generate-debug-items.mjs";
import { injectDebugTools } from "./inject-debug-tools.mjs";
import { SITE_DIR, UPSTREAM_BASE_PATH } from "./version-config.mjs";

export async function prepareCheatBuild({
  chunksDir = path.join(SITE_DIR, "_next", "static", "chunks"),
  indexPath = path.join(SITE_DIR, "index.html"),
  outputPath = path.join(SITE_DIR, "debug-items.json"),
  scriptSrc = `${UPSTREAM_BASE_PATH}/debug-tools.js`,
  expectedItemCount = 44,
} = {}) {
  const itemCount = await generateDebugItems({
    chunksDir,
    outputPath,
    expectedCount: expectedItemCount,
  });
  const injected = await injectDebugTools({ indexPath, scriptSrc });
  return { itemCount, injected };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  prepareCheatBuild()
    .then(({ itemCount, injected }) => {
      console.log(`Prepared ${itemCount} debug items.`);
      console.log(injected ? "Injected debug tools script." : "Debug tools script already present.");
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
