# Non-k Sa-BIVER Next.js Capture

Source URL: https://funa-funa.sakura.ne.jp/202604testtes004v6/

Captured on: 2026-05-25 KST

## Contents

- `raw/index.html` - original HTML response.
- `raw/chunks/` - Next.js/Turbopack JavaScript chunks referenced by the page and dynamically loaded by the page component.
- `raw/css/` - CSS chunk referenced by the page.
- `raw/favicon.ico` - favicon from the deployed page.
- `extracted/discovered-chunks.txt` - JS/CSS chunk paths discovered from the HTML and runtime chunk.
- `extracted/asset-list.txt` - asset URLs discovered from HTML/CSS/JS.
- `extracted/asset-manifest.json` - download result for every discovered asset.
- `extracted/missing-assets.txt` - asset references that the upstream server returned as missing.
- `extracted/file-summary.tsv` - file size summary for downloaded assets.
- `extracted/site-file-summary.tsv` - file size summary for the runnable static mirror.
- `extracted/japanese-strings.tsv` - high-signal Japanese text snippets with an empty `korean` column for translation.
- `extracted/japanese-strings.md` - Markdown view of the same Japanese snippets.
- `extracted/japanese-strings.json` - JSON version of the Japanese snippets.
- `extracted/translation-candidates.tsv` - broader string-literal extraction from JS/HTML/CSS. This is noisy because it includes library/runtime strings.
- `extracted/all-strings.json` and `extracted/unique-strings.json` - raw extraction data for deeper inspection.
- `scripts/extract-japanese.mjs` - regenerates the Japanese translation table.
- `scripts/extract-strings.mjs` - regenerates broad string-literal extraction files.
- `scripts/download-assets.mjs` - discovers and downloads static assets referenced by the built files.
- `site/` - runnable static mirror layout.
- `serve-local.mjs` - local static server. Missing assets are fetched from the original site and cached under `site/`.

## Run Locally

```bash
cd /root/workspace/Non-k-Sa-Biver
node serve-local.mjs
```

Then open:

```text
http://127.0.0.1:4173/202604testtes004v6/
```

## Notes

- This is a built Next.js App Router deployment, not the original source tree.
- The page shell points at `b6d71b0eb4b19136.js`, which then loads additional game chunks.
- No usable `sourceMappingURL` source maps were found in the downloaded files.
- For translation work, start with `extracted/japanese-strings.tsv`; use `extracted/translation-candidates.tsv` only if you need non-Japanese UI strings too.

## Regenerate Extracts

```bash
node scripts/extract-japanese.mjs
node scripts/extract-strings.mjs
node scripts/download-assets.mjs
```

## Translation Workflow

Local planning notes live under `docs/`, which is intentionally gitignored.
Translation tables live under `translate/`.
After editing translation TSV files, run:

```bash
node scripts/merge-translations.mjs
node scripts/apply-translations.mjs
```

## Asset Download Status

Last download pass:

- Discovered assets: 226
- Present locally: 221
- Upstream 404 references: 5

The missing upstream references are listed in `extracted/missing-assets.txt`. They were also 404 on the original server during verification.
