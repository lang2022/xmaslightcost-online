(function () {
  const STORAGE_KEY = "xmas-light-cost-settings-v3"; // 升级版本号以重置旧缓存

  // 区域预设：电价 + 货币
  const REGION_PRESETS = {
    us: { label: "United States", rate: 0.18, currency: "$" },
    ca: { label: "Canada", rate: 0.17, currency: "$" },
    uk: { label: "United Kingdom", rate: 0.26, currency: "£" },
    au: { label: "Australia", rate: 0.30, currency: "$" },
  };

  // 功率预设 (Watts per strand)
  const WATT_PRESETS = {
    incMini: 40.8, // 100 count incandescent
    ledMini: 4.8,  // 100 count LED
    incC9: 175,    // 25 bulbs * 7 watts
    ledC9: 2.4,    // 25 bulbs * ~0.1 watts
  };

  // DOM 元素引用
  const els = {
    countrySelect: document.getElementById("countrySelect"),
    kwhRate: document.getElementById("kwhRate"),
    currencyLabel: document.getElementById("currencyLabel"),
    hoursRange: document.getElementById("hoursRange"),
    hoursInput: document.getElementById("hoursInput"),
    
    // Inputs
    incC9: document.getElementById("incC9Count"),
    incMini: document.getElementById("incMiniCount"),
    ledC9: document.getElementById("ledC9Count"),
    ledMini: document.getElementById("ledMiniCount"),

    // Outputs
    totalCost: document.getElementById("totalCost"),
    resultCurrency: document.getElementById("resultCurrency"),
    totalWatts: document.getElementById("totalWatts"),
    dailyCost: document.getElementById("dailyCost"),
    
    // Savings Block
    savingsBlock: document.getElementById("savingsBlock"),
    savingsAmount: document.getElementById("savingsAmount"),
  };

  let state = {
    region: "us",
    rate: 0.18,
    hours: 5,
    counts: { incC9: 0, incMini: 0, ledC9: 0, ledMini: 0 },
  };

  function init() {
    loadSettings();
    detectRegion();
    bindEvents();
    render();
  }

  function loadSettings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        state = { ...state, ...JSON.parse(saved) };
        // 恢复 UI
        els.countrySelect.value = state.region;
        els.kwhRate.value = state.rate;
        els.hoursInput.value = state.hours;
        els.hoursRange.value = state.hours;
        els.incC9.value = state.counts.incC9 || "";
        els.incMini.value = state.counts.incMini || "";
        els.ledC9.value = state.counts.ledC9 || "";
        els.ledMini.value = state.counts.ledMini || "";
      }
    } catch (e) { console.error(e); }
  }

  function saveSettings() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function detectRegion() {
    if (!localStorage.getItem(STORAGE_KEY)) {
      const lang = navigator.language.toLowerCase();
      let r = "us";
      if (lang.includes("gb") || lang.includes("uk")) r = "uk";
      else if (lang.includes("au")) r = "au";
      else if (lang.includes("ca")) r = "ca";
      
      const preset = REGION_PRESETS[r];
      if (preset) {
        state.region = r;
        state.rate = preset.rate;
        els.countrySelect.value = r;
        els.kwhRate.value = preset.rate;
      }
    }
  }

  function bindEvents() {
    // 区域切换
    els.countrySelect.addEventListener("change", (e) => {
      const r = e.target.value;
      const preset = REGION_PRESETS[r] || REGION_PRESETS.us;
      els.kwhRate.value = preset.rate;
      state.rate = preset.rate;
      state.region = r;
      calculate();
    });

    els.kwhRate.addEventListener("input", (e) => {
      state.rate = parseFloat(e.target.value) || 0;
      calculate();
    });

    // --- 核心修复：输入框逻辑 ---
    // 输入时：只更新状态，不限制范围，不强制修改 Input 值
    els.hoursInput.addEventListener("input", (e) => {
      let val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        state.hours = val; // 暂存，哪怕是 100 也没关系，render时再用
        // 仅更新滑块视觉（滑块本身有 max=24 限制）
        els.hoursRange.value = Math.min(24, Math.max(1, val));
        calculate(false); // false = 不重写输入框
      }
    });

    // 失去焦点时：执行严格校验和回填
    els.hoursInput.addEventListener("blur", (e) => {
      let val = parseFloat(e.target.value);
      if (isNaN(val)) val = 5;
      val = Math.min(24, Math.max(1, val));
      
      els.hoursInput.value = val;
      els.hoursRange.value = val;
      state.hours = val;
      calculate();
    });

    // 滑块拖动
    els.hoursRange.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value);
      els.hoursInput.value = val;
      state.hours = val;
      calculate();
    });

    // 灯串数量
    ["incC9", "incMini", "ledC9", "ledMini"].forEach(key => {
      els[key].addEventListener("input", (e) => {
        state.counts[key] = parseInt(e.target.value) || 0;
        calculate();
      });
    });
  }

  function calculate(updateInputs = true) {
    if(updateInputs) saveSettings();
    render(updateInputs);
  }

  function render(updateInputs) {
    const preset = REGION_PRESETS[state.region] || REGION_PRESETS.us;
    els.currencyLabel.textContent = preset.currency + "/kWh";
    els.resultCurrency.textContent = preset.currency;

    // 计算
    const totalWatts = 
      (state.counts.incC9 * WATT_PRESETS.incC9) +
      (state.counts.incMini * WATT_PRESETS.incMini) +
      (state.counts.ledC9 * WATT_PRESETS.ledC9) +
      (state.counts.ledMini * WATT_PRESETS.ledMini);

    const safeHours = Math.min(24, Math.max(0, state.hours)); // 计算时用安全值
    const dailyKwh = (totalWatts * safeHours) / 1000;
    const dailyCost = dailyKwh * state.rate;
    const seasonCost = dailyCost * 31;

    // 更新 UI
    els.totalWatts.textContent = Math.round(totalWatts).toLocaleString() + " W";
    els.dailyCost.textContent = preset.currency + dailyCost.toFixed(2);
    els.totalCost.textContent = seasonCost.toFixed(2);

    // 计算省钱潜力 (Upsell)
    // 逻辑：如果把现有的白炽灯换成同等数量的 LED，能省多少？
    if (state.counts.incC9 > 0 || state.counts.incMini > 0) {
      const currentIncCost = ((state.counts.incC9 * WATT_PRESETS.incC9 + state.counts.incMini * WATT_PRESETS.incMini) * safeHours / 1000) * state.rate * 31;
      const equivalentLedCost = ((state.counts.incC9 * WATT_PRESETS.ledC9 + state.counts.incMini * WATT_PRESETS.ledMini) * safeHours / 1000) * state.rate * 31;
      
      const savings = currentIncCost - equivalentLedCost;

      if (savings > 2) {
        els.savingsAmount.textContent = preset.currency + savings.toFixed(2);
        els.savingsBlock.classList.remove("hidden");
        els.savingsBlock.classList.add("block");
      } else {
        els.savingsBlock.classList.add("hidden");
        els.savingsBlock.classList.remove("block");
      }
    } else {
      els.savingsBlock.classList.add("hidden");
      els.savingsBlock.classList.remove("block");
    }
  }

  init();
})();