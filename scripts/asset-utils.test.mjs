import assert from "node:assert/strict";
import test from "node:test";
import { extractAssetPaths } from "./asset-utils.mjs";

test("extracts direct base-path asset URLs", () => {
  const source = `
    const a = "/202605testtest050v7/assets/map/grass.png";
    const b = '/202605testtest050v7/assets/audio/bgm/town_bgm.mp3';
    const c = "/202605testtest050v7/_next/static/media/font-file.woff2";
  `;

  assert.deepEqual(extractAssetPaths(source), [
    "/202605testtest050v7/_next/static/media/font-file.woff2",
    "/202605testtest050v7/assets/audio/bgm/town_bgm.mp3",
    "/202605testtest050v7/assets/map/grass.png",
  ]);
});

test("extracts BASE_PATH style asset suffixes", () => {
  const source = `
    const o = e => \`\${BASE_PATH}\${e}\`;
    const image = o("/assets/items/icon_book.png");
    const sound = a('/assets/audio/se/button_click.mp3');
  `;

  assert.deepEqual(extractAssetPaths(source), [
    "/202605testtest050v7/assets/audio/se/button_click.mp3",
    "/202605testtest050v7/assets/items/icon_book.png",
  ]);
});

test("resolves NPC portrait, sprite, and CG helper arguments", () => {
  const source = `
    portrait: resolveNpcPortrait("npc01a_1.png"),
    sheet: resolveNpcSprite('NPC01.png'),
    cg: resolveCgAsset("NPC01CG_04a.png"),
  `;

  assert.deepEqual(extractAssetPaths(source), [
    "/202605testtest050v7/assets/cg/NPC01CG_04a.png",
    "/202605testtest050v7/assets/entities/npc/portraits/npc01a_1.png",
    "/202605testtest050v7/assets/entities/npc/spritesheets/NPC01.png",
  ]);
});

test("ignores generic extension examples that are not game assets", () => {
  const source = `
    const fake = "file.json";
    const runtime = "static/chunks/abc123.js";
    const asset = "/assets/cg/test01.png";
  `;

  assert.deepEqual(extractAssetPaths(source), [
    "/202605testtest050v7/assets/cg/test01.png",
  ]);
});
