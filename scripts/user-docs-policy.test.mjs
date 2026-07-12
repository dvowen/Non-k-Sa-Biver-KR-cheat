import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import test from "node:test";
import { GITHUB_PAGES_BASE_PATH } from "./version-config.mjs";

const PATCH_NOTES = "USER_PATCH_NOTES_v0.7.md";
const GUIDE = "GUIDE_v0.7.md";
const ARCA_GUIDE = "GUIDE_v0.7_ARCA.html";
const DEPLOY_URL = `https://dvowen.github.io${GITHUB_PAGES_BASE_PATH}/`;
const SAVE_MANAGER_URL = `${DEPLOY_URL}202605testtest050v7/save-manager.html`;

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
];

const developerSlopPatterns = [
  /friend_h_event_(?:uke|seme)_done/,
  /merchant_400_event_done/,
  /sodio_max_event_done/,
  /cleared_(?:desert|ruins)/,
  /`merchant`/,
  /loot_and_link_save_v1/,
  /저장 스키마/,
  /번역[^\n]*903|903개/,
  /1,204/,
  /일본어 감사 결과/,
  /HUMANIZE-SUMMARY/,
  /v0\.7 코드에서는/,
  /배포본에는 이전 v0\.6 게임 파일/,
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("user patch notes explain player-visible v0.7 changes without implementation debris", async () => {
  const patchNotes = await fs.readFile(PATCH_NOTES, "utf8");

  assert.match(patchNotes, /v0\.6에서 v0\.7/);
  assert.match(patchNotes, new RegExp(escapeRegExp(DEPLOY_URL)));
  for (const fact of requiredV07Facts) assert.match(patchNotes, new RegExp(escapeRegExp(fact)));
  for (const pattern of developerSlopPatterns) assert.doesNotMatch(patchNotes, pattern);
});

test("v0.7 guide preserves unlock conditions and gives complete save instructions", async () => {
  const guide = await fs.readFile(GUIDE, "utf8");

  assert.match(guide, /숲에서 5분/);
  assert.match(guide, /서로 다른 알 5개/);
  assert.match(guide, /호감도 100/);
  assert.match(guide, /100G당.*\+1/);
  assert.match(guide, /50G당.*\+1/);
  assert.match(guide, /1회.*5000G/);
  assert.match(guide, /유적.*클리어/);
  assert.match(guide, new RegExp(escapeRegExp(SAVE_MANAGER_URL)));
  assert.match(guide, /내보내기/);
  assert.match(guide, /파일에서 불러오기/);
  assert.match(guide, /붙여넣/);
  assert.match(guide, /일반판과 치트판.*같은 세이브/);
  for (const pattern of developerSlopPatterns) assert.doesNotMatch(guide, pattern);
});

test("Arca Live guide reads like a simple community post and uses sanitizer-safe inline HTML", async () => {
  const html = await fs.readFile(ARCA_GUIDE, "utf8");
  const visibleText = html.replace(/<[^>]+>/g, "").replace(/\s+/g, "");
  const encodedDeployUrl = Buffer.from(DEPLOY_URL).toString("base64");
  const encodedSaveManagerUrl = Buffer.from(SAVE_MANAGER_URL).toString("base64");
  const detailsCount = [...html.matchAll(/<details\b/g)].length;
  const detailsCloseCount = [...html.matchAll(/<\/details>/g)].length;
  const summaryCount = [...html.matchAll(/<summary\b/g)].length;
  const summaryCloseCount = [...html.matchAll(/<\/summary>/g)].length;

  assert.ok(detailsCount >= 4);
  assert.equal(detailsCount, detailsCloseCount);
  assert.equal(summaryCount, summaryCloseCount);
  assert.match(html, />Non-K-Sa-Biver<\/h[1-6]>/i);
  assert.doesNotMatch(html, /사냥꾼 야전\s*수첩|v0\.7 신규 패시브 무기/);
  for (const weapon of requiredV07Facts.slice(4)) {
    assert.doesNotMatch(html, new RegExp(escapeRegExp(weapon)));
  }
  assert.doesNotMatch(html, /linear-gradient|box-shadow|letter-spacing/i);
  assert.doesNotMatch(html, /<style\b|<script\b|<code\b|<button\b|class=|<!--/i);
  assert.doesNotMatch(html, /<a\b[^>]*href=|https?:\/\//i);
  assert.doesNotMatch(html, /(?:cursor|position|z-index|overflow|opacity|filter|transform|animation|transition)\s*:/i);
  assert.doesNotMatch(html, /display\s*:\s*(?:flex|grid)/i);
  assert.match(visibleText, new RegExp(escapeRegExp(encodedDeployUrl)));
  assert.match(visibleText, new RegExp(escapeRegExp(encodedSaveManagerUrl)));
  assert.match(visibleText, /전에올렸던.*v0\.7.*다시손봤음/);
  assert.match(visibleText, /5분.*버티면/);
  assert.match(visibleText, /즐겜/);
  for (const fact of requiredV07Facts.slice(0, 4)) assert.match(html, new RegExp(escapeRegExp(fact)));
  for (const pattern of developerSlopPatterns) assert.doesNotMatch(html, pattern);
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
