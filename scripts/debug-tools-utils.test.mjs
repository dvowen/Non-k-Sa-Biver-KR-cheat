import assert from "node:assert/strict";
import test from "node:test";
import {
  ensureScriptTag,
  extractDebugItems,
} from "./debug-tools-utils.mjs";

test("extractDebugItems reads translated item metadata and excludes currency", () => {
  const chunk = String.raw`
    const items={
      gold_coin:{id:"gold_coin",name:"금화",description:"재화",effectType:"RESOURCE",value:1,price:0},
      potion:{id:"potion",name:"회복약",description:"HP를 회복한다.",effectType:"HEAL",value:50,price:100},
      arrow:{id:"arrow",name:"화살촉 강화",description:"공격력이 오른다.",effectType:"PASSIVE_WEAPON",value:1,price:200}
    };
  `;

  assert.deepEqual(extractDebugItems(chunk), [
    {
      id: "arrow",
      name: "화살촉 강화",
      description: "공격력이 오른다.",
      effectType: "PASSIVE_WEAPON",
      price: 200,
    },
    {
      id: "potion",
      name: "회복약",
      description: "HP를 회복한다.",
      effectType: "HEAL",
      price: 100,
    },
  ]);
});

test("ensureScriptTag injects once before the closing body", () => {
  const scriptSrc = "/202605testtest050v7/debug-tools.js";
  const html = "<html><body><main></main></body></html>";
  const injected = ensureScriptTag(html, scriptSrc);

  assert.match(injected, /debug-tools\.js" defer><\/script><\/body>/);
  assert.equal(ensureScriptTag(injected, scriptSrc), injected);
});
