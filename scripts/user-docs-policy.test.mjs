import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import test from "node:test";
import { GITHUB_PAGES_BASE_PATH } from "./version-config.mjs";

const PATCH_NOTES = "USER_PATCH_NOTES_v0.7.md";
const GUIDE = "GUIDE_v0.7.md";
const ARCA_GUIDE = "GUIDE_v0.7_ARCA.html";
const DEPLOY_URL = `https://dvowen.github.io${GITHUB_PAGES_BASE_PATH}/`;

const requiredV07Facts = [
  "알베르트의 보답 (수)",
  "알베르트의 보답 (공)",
  "타간과의 시간 4 (공)",
  "타간과의 시간 4 (수)",
  "사냥꾼의 중력 그물",
  "수호 위스프",
  "뇌광 투창",
  "반중력 바람총",
  "짐승 퇴치 뿔피리",
  "loot_and_link_save_v1",
];

test("user patch notes cover the verified v0.7 changes", async () => {
  const patchNotes = await fs.readFile(PATCH_NOTES, "utf8");

  assert.match(patchNotes, /v0\.6에서 v0\.7/);
  assert.match(patchNotes, new RegExp(DEPLOY_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  for (const fact of requiredV07Facts) assert.match(patchNotes, new RegExp(fact.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(patchNotes, /1,204/);
  assert.match(patchNotes, /903/);
});

test("v0.7 guide preserves the verified unlock conditions", async () => {
  const guide = await fs.readFile(GUIDE, "utf8");

  assert.match(guide, /숲에서 5분/);
  assert.match(guide, /서로 다른 알 5개/);
  assert.match(guide, /호감도 100/);
  assert.match(guide, /100G당.*\+1/);
  assert.match(guide, /50G당.*\+1/);
  assert.match(guide, /1회.*5000G/);
  assert.match(guide, /유적.*클리어/);
  assert.match(guide, /merchant_400_event_done/);
  assert.match(guide, /friend_h_event_uke_done/);
  assert.match(guide, /friend_h_event_seme_done/);
});

test("Arca Live guide mirrors the guide with self-contained inline styling", async () => {
  const html = await fs.readFile(ARCA_GUIDE, "utf8");
  const detailsCount = [...html.matchAll(/<details\b/g)].length;
  const detailsCloseCount = [...html.matchAll(/<\/details>/g)].length;
  const summaryCount = [...html.matchAll(/<summary\b/g)].length;
  const summaryCloseCount = [...html.matchAll(/<\/summary>/g)].length;

  assert.ok(detailsCount >= 4);
  assert.equal(detailsCount, detailsCloseCount);
  assert.equal(summaryCount, summaryCloseCount);
  assert.match(html, /font-size: 24px/);
  assert.doesNotMatch(html, /<style\b|class=/);
  for (const fact of requiredV07Facts.slice(0, 9)) assert.match(html, new RegExp(fact.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("cheat builds document their extra controls without leaking into the public guide", async () => {
  const patchNotes = await fs.readFile(PATCH_NOTES, "utf8");
  const guide = await fs.readFile(GUIDE, "utf8");
  const combined = `${patchNotes}\n${guide}`;

  if (GITHUB_PAGES_BASE_PATH.endsWith("-cheat")) {
    assert.match(combined, /설정.*5회/);
    assert.match(combined, /HP 무제한/);
    assert.match(combined, /일반판.*권장/);
  } else {
    assert.doesNotMatch(combined, /설정.*5회|HP 무제한/);
  }
});
