import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { SITE_DIR } from "./version-config.mjs";

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

async function loadRuntime() {
  const listeners = new Map();
  const emitted = [];
  const intervals = new Map();
  const clearedIntervals = [];
  const storage = new Map();
  let nextTimer = 1;

  const eventBus = {
    on(name, listener) {
      const handlers = listeners.get(name) ?? [];
      handlers.push(listener);
      listeners.set(name, handlers);
    },
    off(name, listener) {
      listeners.set(name, (listeners.get(name) ?? []).filter((handler) => handler !== listener));
    },
    emit(name, payload) {
      emitted.push({ name, payload });
      for (const listener of listeners.get(name) ?? []) listener(payload);
    },
  };
  const document = {
    currentScript: {
      src: "https://example.test/Non-k-Sa-Biver-KR-cheat/202605testtest050v7/debug-tools.js",
    },
    documentElement: {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
  const window = {
    __EventBus: eventBus,
    location: { href: "https://example.test/fallback" },
  };
  const context = vm.createContext({
    URL,
    console,
    document,
    fetch,
    localStorage: {
      getItem(key) { return storage.get(key) ?? null; },
      setItem(key, value) { storage.set(key, value); },
      removeItem(key) { storage.delete(key); },
    },
    MutationObserver: class {
      observe() {}
    },
    setInterval(callback) {
      const id = nextTimer++;
      intervals.set(id, callback);
      return id;
    },
    clearInterval(id) {
      clearedIntervals.push(id);
      intervals.delete(id);
    },
    window,
  });
  window.window = window;

  const source = await fs.readFile(path.join(SITE_DIR, "debug-tools.js"), "utf8");
  vm.runInContext(source, context);
  return {
    tools: window.NonKCheatTools,
    eventBus,
    emitted,
    intervals,
    clearedIntervals,
    storage,
  };
}

test("runtime derives its base path from the loaded script URL", async () => {
  const { tools } = await loadRuntime();

  assert.equal(
    tools.basePath,
    "/Non-k-Sa-Biver-KR-cheat/202605testtest050v7",
  );
});

test("runtime maps cheat controls to the existing EventBus contracts", async () => {
  const { tools, emitted } = await loadRuntime();

  tools.addGold(1000);
  tools.grantItem("potion", 3);
  tools.changeBattleTime(-30);
  tools.saveCurrentState();

  assert.deepEqual(plain(emitted), [
    { name: "add-coins", payload: 1000 },
    { name: "add-item", payload: { itemId: "potion", count: 3 } },
    { name: "debug-forward-time", payload: -30 },
    { name: "request-auto-save" },
  ]);
});

test("HP unlimited heals to the observed max without inflating save data", async () => {
  const { tools, eventBus, emitted, intervals, clearedIntervals } = await loadRuntime();
  eventBus.emit("update-player-hp", { current: 35, max: 120 });
  emitted.length = 0;

  tools.setHpUnlimited(true);
  assert.equal(intervals.size, 1);
  [...intervals.values()][0]();

  assert.deepEqual(plain(emitted), [
    { name: "update-player-hp", payload: { current: 120, max: 120 } },
    { name: "resurrection-activated" },
  ]);
  assert.doesNotMatch(JSON.stringify(emitted), /999999/);

  tools.setHpUnlimited(false);
  assert.equal(intervals.size, 0);
  assert.equal(clearedIntervals.length, 1);
});

test("settings unlock requires five taps and lock clears the persisted flag", async () => {
  const { tools, storage } = await loadRuntime();

  assert.deepEqual(plain(tools.recordSettingsTap()), { unlocked: false, remaining: 4 });
  assert.deepEqual(plain(tools.recordSettingsTap()), { unlocked: false, remaining: 3 });
  assert.deepEqual(plain(tools.recordSettingsTap()), { unlocked: false, remaining: 2 });
  assert.deepEqual(plain(tools.recordSettingsTap()), { unlocked: false, remaining: 1 });
  assert.deepEqual(plain(tools.recordSettingsTap()), { unlocked: true, remaining: 0 });
  assert.equal(storage.get("debug_tools_unlocked"), "true");

  tools.lock();
  assert.equal(storage.has("debug_tools_unlocked"), false);
});
