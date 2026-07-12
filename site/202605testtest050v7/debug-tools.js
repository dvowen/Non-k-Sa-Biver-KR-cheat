(() => {
  const UNLOCK_KEY = "debug_tools_unlocked";
  const loadedScriptUrl = new URL(document.currentScript?.src || window.location.href, window.location.href);
  const BASE_PATH = loadedScriptUrl.pathname.endsWith("/debug-tools.js")
    ? loadedScriptUrl.pathname.slice(0, -"/debug-tools.js".length)
    : loadedScriptUrl.pathname.replace(/\/$/, "");
  const SAVE_MANAGER_URL = `${BASE_PATH}/save-manager.html`;
  const ITEM_MANIFEST_URL = `${BASE_PATH}/debug-items.json`;

  const state = {
    settingsUnlockTapCount: 0,
    panelOpen: false,
    hpUnlimited: false,
    hpTimer: null,
    lastPlayerMaxHp: null,
    hpObserverBus: null,
    items: [],
    filteredItems: [],
  };

  function bus() {
    return window.__EventBus;
  }

  function setStatus(message) {
    const element = document.querySelector("[data-debug-tools-status]");
    if (element) element.textContent = message;
  }

  function emit(name, payload) {
    if (!bus() || typeof bus().emit !== "function") {
      setStatus("게임 이벤트 버스를 찾지 못했습니다.");
      return false;
    }
    bus().emit(name, payload);
    return true;
  }

  function ensureHpObserver() {
    const currentBus = bus();
    if (!currentBus || currentBus === state.hpObserverBus || typeof currentBus.on !== "function") return;
    const observeHp = (payload) => {
      if (Number.isFinite(payload?.max) && payload.max > 0) {
        state.lastPlayerMaxHp = payload.max;
      }
    };
    currentBus.on("update-player-hp", observeHp);
    state.hpObserverBus = currentBus;
  }

  function isUnlocked() {
    return localStorage.getItem(UNLOCK_KEY) === "true";
  }

  function unlock() {
    localStorage.setItem(UNLOCK_KEY, "true");
    ensureSettingsEnhancements();
    setSettingsHint("관리자 도구가 열렸습니다.");
  }

  function lock() {
    localStorage.removeItem(UNLOCK_KEY);
    state.settingsUnlockTapCount = 0;
    setHpUnlimited(false);
    closePanel();
    ensureSettingsEnhancements();
    setSettingsHint("관리자 도구를 잠갔습니다.");
  }

  function recordSettingsTap() {
    if (isUnlocked()) return { unlocked: true, remaining: 0 };
    state.settingsUnlockTapCount += 1;
    const remaining = Math.max(0, 5 - state.settingsUnlockTapCount);
    if (remaining === 0) {
      unlock();
      return { unlocked: true, remaining };
    }
    return { unlocked: false, remaining };
  }

  function openSaveManager() {
    window.location.href = SAVE_MANAGER_URL;
  }

  function addGold(amount) {
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      setStatus("추가할 골드는 1 이상의 정수로 입력하세요.");
      return false;
    }
    const emitted = emit("add-coins", amount);
    if (emitted) setStatus(`${amount.toLocaleString("ko-KR")} 골드를 추가했습니다.`);
    return emitted;
  }

  function grantItem(itemId, count) {
    if (!itemId || !Number.isSafeInteger(count) || count <= 0) {
      setStatus("아이템과 1 이상의 수량을 선택하세요.");
      return false;
    }
    const emitted = emit("add-item", { itemId, count });
    if (emitted) setStatus(`${itemId} ${count}개를 지급했습니다.`);
    return emitted;
  }

  function saveCurrentState() {
    const emitted = emit("request-auto-save");
    if (emitted) setStatus("현재 상태 저장을 요청했습니다.");
    return emitted;
  }

  function healWithoutInflatingMaxHp() {
    if (Number.isFinite(state.lastPlayerMaxHp) && state.lastPlayerMaxHp > 0) {
      emit("update-player-hp", {
        current: state.lastPlayerMaxHp,
        max: state.lastPlayerMaxHp,
      });
    }
    emit("resurrection-activated");
  }

  function setHpUnlimited(enabled) {
    state.hpUnlimited = Boolean(enabled);
    if (state.hpTimer) {
      clearInterval(state.hpTimer);
      state.hpTimer = null;
    }
    if (state.hpUnlimited) {
      ensureHpObserver();
      state.hpTimer = setInterval(healWithoutInflatingMaxHp, 300);
      setStatus("HP 무제한을 켰습니다.");
    } else {
      setStatus("HP 무제한을 껐습니다.");
    }
  }

  function changeBattleTime(seconds) {
    if (!Number.isSafeInteger(seconds) || seconds === 0) {
      setStatus("조정할 시간 값을 인식하지 못했습니다.");
      return false;
    }
    const emitted = emit("debug-forward-time", seconds);
    if (emitted) setStatus(`${seconds > 0 ? "+" : ""}${seconds}초 사냥터 시간 조정을 요청했습니다.`);
    return emitted;
  }

  async function loadItems() {
    if (state.items.length > 0) return state.items;
    const response = await fetch(ITEM_MANIFEST_URL);
    if (!response.ok) throw new Error("아이템 목록을 불러오지 못했습니다.");
    state.items = await response.json();
    state.filteredItems = state.items;
    return state.items;
  }

  function renderItemOptions(select, items) {
    select.innerHTML = "";
    for (const item of items) {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = `${item.name} / ${item.id}`;
      select.append(option);
    }
  }

  function filterItems(panel) {
    const query = panel.querySelector("[data-debug-item-filter]").value.trim().toLowerCase();
    const select = panel.querySelector("[data-debug-item-select]");
    state.filteredItems = state.items.filter((item) => {
      return item.id.toLowerCase().includes(query) || item.name.toLowerCase().includes(query);
    });
    renderItemOptions(select, state.filteredItems);
  }

  function readPositiveInteger(value, fallback, max) {
    const number = Number(value || fallback);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(1, Math.floor(number)));
  }

  function grantSelectedItem() {
    const select = document.querySelector("[data-debug-item-select]");
    const quantity = document.querySelector("[data-debug-item-qty]");
    grantItem(select?.value, readPositiveInteger(quantity?.value, 1, 99));
  }

  async function populateItemSelect(panel) {
    const items = await loadItems();
    renderItemOptions(panel.querySelector("[data-debug-item-select]"), items);
  }

  function stylePanelButton(button, variant = "normal") {
    button.style.cssText =
      "min-height:34px;padding:0 10px;border-radius:6px;border:1px solid #475569;background:#1e293b;color:#f8fafc;font-weight:700;cursor:pointer";
    if (variant === "danger") {
      button.style.borderColor = "#b91c1c";
      button.style.background = "#7f1d1d";
    }
  }

  function openPanel() {
    state.panelOpen = true;
    document.querySelector("[data-debug-tools-panel]")?.remove();

    const panel = document.createElement("div");
    panel.dataset.debugToolsPanel = "true";
    panel.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:10000;width:min(380px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto;background:rgba(15,23,42,.96);color:white;border:1px solid rgba(148,163,184,.45);border-radius:8px;padding:14px;font-family:system-ui,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,.45)";
    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px">
        <strong>테스트 도구</strong>
        <button data-debug-close type="button">닫기</button>
      </div>
      <div style="display:grid;gap:8px">
        <button data-debug-gold="1000" type="button">골드 +1,000</button>
        <button data-debug-gold="10000" type="button">골드 +10,000</button>
        <div style="display:flex;gap:6px">
          <input data-debug-gold-custom type="number" value="1000" min="1" style="flex:1;min-width:0;background:#020617;color:white;border:1px solid #475569;border-radius:6px;padding:0 8px" />
          <button data-debug-gold-apply type="button">골드 추가</button>
        </div>
        <label style="display:flex;align-items:center;gap:6px"><input data-debug-hp-unlimited type="checkbox" /> HP 무제한</label>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
          <button data-debug-time="-10" type="button">-10초</button>
          <button data-debug-time="-30" type="button">-30초</button>
          <button data-debug-time="-60" type="button">-1분</button>
          <button data-debug-time="10" type="button">+10초</button>
          <button data-debug-time="30" type="button">+30초</button>
          <button data-debug-time="60" type="button">+1분</button>
        </div>
        <input data-debug-item-filter type="search" placeholder="아이템 이름 또는 ID 검색" style="background:#020617;color:white;border:1px solid #475569;border-radius:6px;min-height:34px;padding:0 8px" />
        <select data-debug-item-select style="background:#020617;color:white;border:1px solid #475569;border-radius:6px;min-height:34px;padding:0 8px"></select>
        <div style="display:flex;gap:6px">
          <input data-debug-item-qty type="number" value="1" min="1" style="width:90px;background:#020617;color:white;border:1px solid #475569;border-radius:6px;padding:0 8px" />
          <button data-debug-grant-item type="button">아이템 지급</button>
        </div>
        <button data-debug-save-manager type="button">세이브 관리</button>
        <button data-debug-save type="button">현재 상태 저장</button>
        <button data-debug-lock type="button">테스트 도구 잠그기</button>
        <div data-debug-tools-status style="min-height:20px;color:#fde68a;font-size:12px"></div>
      </div>
    `;
    document.body.append(panel);

    panel.querySelectorAll("button").forEach((button) => {
      stylePanelButton(button, button.hasAttribute("data-debug-lock") ? "danger" : "normal");
    });
    panel.querySelector("[data-debug-close]").addEventListener("click", closePanel);
    panel.querySelectorAll("[data-debug-gold]").forEach((button) => {
      button.addEventListener("click", () => addGold(Number(button.dataset.debugGold)));
    });
    panel.querySelector("[data-debug-gold-apply]").addEventListener("click", () => {
      addGold(readPositiveInteger(panel.querySelector("[data-debug-gold-custom]").value, 1000, 9999999));
    });
    panel.querySelector("[data-debug-hp-unlimited]").checked = state.hpUnlimited;
    panel.querySelector("[data-debug-hp-unlimited]").addEventListener("change", (event) => {
      setHpUnlimited(event.currentTarget.checked);
    });
    panel.querySelectorAll("[data-debug-time]").forEach((button) => {
      button.addEventListener("click", () => changeBattleTime(Number(button.dataset.debugTime)));
    });
    panel.querySelector("[data-debug-save-manager]").addEventListener("click", openSaveManager);
    panel.querySelector("[data-debug-save]").addEventListener("click", saveCurrentState);
    panel.querySelector("[data-debug-lock]").addEventListener("click", lock);
    panel.querySelector("[data-debug-grant-item]").addEventListener("click", grantSelectedItem);
    panel.querySelector("[data-debug-item-filter]").addEventListener("input", () => filterItems(panel));
    populateItemSelect(panel).catch((error) => {
      setStatus(error instanceof Error ? error.message : String(error));
    });
  }

  function closePanel() {
    state.panelOpen = false;
    setHpUnlimited(false);
    document.querySelector("[data-debug-tools-panel]")?.remove();
  }

  function createMenuButton(label, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.className = "group relative px-8 py-4 bg-black/40 border border-slate-800/50 rounded hover:bg-slate-800/40 transition-all duration-300 hover:border-slate-500/50 hover:shadow-[0_0_20px_rgba(148,163,184,0.1)] overflow-hidden text-xl font-bold text-slate-300 tracking-widest";
    button.addEventListener("click", onClick);
    return button;
  }

  function findSettingsRoot(heading) {
    let node = heading.parentElement;
    for (let depth = 0; node && depth < 8; depth += 1) {
      if (node.textContent.includes("설정은 자동으로 저장됩니다")) return node;
      node = node.parentElement;
    }
    return heading.parentElement;
  }

  function findSettingsContent(root) {
    return [...root.querySelectorAll("div")].find((element) => {
      return element.textContent.includes("설정은 자동으로 저장됩니다");
    }) || root;
  }

  function ensureSettingsEnhancements() {
    const heading = [...document.querySelectorAll("h2")].find((element) => {
      const text = element.textContent.replace(/\s+/g, "");
      return text === "⚙️설정" || text === "설정";
    });
    if (!heading) return;

    if (!heading.dataset.debugUnlockBound) {
      heading.dataset.debugUnlockBound = "true";
      heading.style.cursor = "default";
      heading.addEventListener("click", () => {
        const result = recordSettingsTap();
        if (!result.unlocked && result.remaining <= 2) {
          setSettingsHint(`${result.remaining}번 더 탭하면 관리자 도구가 열립니다.`);
        }
      });
    }

    const modal = findSettingsRoot(heading);
    if (!modal) return;
    const content = findSettingsContent(modal);

    let actions = modal.querySelector("[data-debug-settings-actions]");
    if (!actions) {
      actions = document.createElement("div");
      actions.dataset.debugSettingsActions = "true";
      actions.style.cssText = "display:flex;justify-content:center;gap:8px;margin-top:16px";
      content.append(actions);
    }

    const debugButton = actions.querySelector("[data-debug-open]");
    if (isUnlocked() && !debugButton) {
      const button = createMenuButton("관리자 도구", openPanel);
      button.dataset.debugOpen = "true";
      button.style.fontSize = "14px";
      button.style.minHeight = "40px";
      button.style.width = "180px";
      actions.append(button);
    } else if (!isUnlocked() && debugButton) {
      debugButton.remove();
    }
  }

  function setSettingsHint(message) {
    const heading = [...document.querySelectorAll("h2")].find((element) => {
      const text = element.textContent.replace(/\s+/g, "");
      return text === "⚙️설정" || text === "설정";
    });
    if (!heading) return;
    let hint = document.querySelector("[data-debug-unlock-hint]");
    if (!hint) {
      hint = document.createElement("div");
      hint.dataset.debugUnlockHint = "true";
      hint.style.cssText = "margin-top:6px;color:#fde68a;font-size:12px;text-align:center";
      heading.insertAdjacentElement("afterend", hint);
    }
    hint.textContent = message;
  }

  function scan() {
    ensureHpObserver();
    ensureSettingsEnhancements();
  }

  window.NonKCheatTools = {
    basePath: BASE_PATH,
    addGold,
    changeBattleTime,
    closePanel,
    grantItem,
    lock,
    openPanel,
    recordSettingsTap,
    saveCurrentState,
    scan,
    setHpUnlimited,
  };

  const observer = new MutationObserver(scan);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  scan();
})();
