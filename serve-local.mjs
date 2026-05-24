import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.join(__dirname, "site");
const upstream = "https://funa-funa.sakura.ne.jp";
const port = Number(process.env.PORT || 4173);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath);
  const normalized = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  return path.join(siteRoot, normalized);
}

function localPathForRequest(reqUrl) {
  const url = new URL(reqUrl, `http://localhost:${port}`);
  let pathname = url.pathname;
  if (pathname === "/") pathname = "/202604testtes004v6/";
  if (pathname.endsWith("/")) pathname += "index.html";
  return { pathname: url.pathname, filePath: safePath(pathname), search: url.search };
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    "Content-Type": contentTypes[ext] || "application/octet-stream",
    "Cache-Control": "no-cache",
  });
  fs.createReadStream(filePath).pipe(res);
}

async function fetchAndCache(pathname, search, filePath) {
  const upstreamUrl = `${upstream}${pathname}${search}`;
  const response = await fetch(upstreamUrl);
  if (!response.ok) return false;

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
  return true;
}

const server = http.createServer(async (req, res) => {
  try {
    const { pathname, filePath, search } = localPathForRequest(req.url || "/");

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      sendFile(res, filePath);
      return;
    }

    if (await fetchAndCache(pathname, search, filePath)) {
      console.log(`cached ${pathname}`);
      sendFile(res, filePath);
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(`Not found: ${pathname}\n`);
  } catch (error) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(`${error?.stack || error}\n`);
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Serving http://127.0.0.1:${port}/202604testtes004v6/`);
  console.log("Missing assets will be fetched from the original site and cached under site/.");
});
