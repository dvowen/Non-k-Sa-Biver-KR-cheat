import test from "node:test";
import assert from "node:assert/strict";
import {
  extractDebugItems,
  ensureScriptTag,
} from "./debug-tools-utils.mjs";

test("extractDebugItems reads item metadata from translated chunk text", () => {
  const chunk = String.raw`
    let a=e=>e,s={
      potion:{id:"potion",name:"회복약",description:"HP를 50 회복한다.",effectType:"HEAL",value:50,price:100,icon:a("/x.png")},
      arrow:{id:"arrow",name:"화살촉 강화",description:"화살 위력이 오른다.",effectType:"PASSIVE_WEAPON",value:1,price:100,icon:a("/y.png")}
    };e.s(["ITEM_DATA",0,s])
  `;

  assert.deepEqual(extractDebugItems(chunk), [
    {
      id: "arrow",
      name: "화살촉 강화",
      description: "화살 위력이 오른다.",
      effectType: "PASSIVE_WEAPON",
      price: 100,
    },
    {
      id: "potion",
      name: "회복약",
      description: "HP를 50 회복한다.",
      effectType: "HEAL",
      price: 100,
    },
  ]);
});

test("ensureScriptTag injects debug script before closing body", () => {
  const html = "<html><head></head><body><main></main></body></html>";
  const output = ensureScriptTag(html, "/202604testtes004v6/debug-tools.js");

  assert.match(output, /<script src="\/202604testtes004v6\/debug-tools\.js" defer><\/script><\/body>/);
});

test("ensureScriptTag is idempotent", () => {
  const html = '<html><body><script src="/202604testtes004v6/debug-tools.js" defer></script></body></html>';

  assert.equal(ensureScriptTag(html, "/202604testtes004v6/debug-tools.js"), html);
});
