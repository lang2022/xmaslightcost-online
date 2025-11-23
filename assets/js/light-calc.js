// assets/js/light-calc.js
(function () {
  const STORAGE_KEY = "xmas-light-cost-settings-v2";

  // 区域预设：电价 + 货币
  const REGION_PRESETS = {
    us: { label: "United States", rate: 0.18, currency: "$" },
    ca: { label: "Canada", rate: 0.17, currency: "$" },
    uk: { label: "United Kingdom", rate: 0.26, currency: "£" },
    au: { label: "Australia", rate: 0.30, currency: "$" },
    other: { label: "Other / not listed", rate: 0.12, currency: "$" },
  };

  // 灯串典型功率（来自常见产品参数）
  const WATT_PRESETS = {
    incMini: 40, // 100 灯白炽 mini 串
    ledMini: 5, // 100 灯 LED mini 串
    incC9: 150, // C9 白炽串
    ledC9: 15, // C9 LED 串
  };

  let currentRegion = "us";
  let currentCurrencySymbol = "$";

  function $(id) {
    return document.getElementById(id);
  }

  function detectDefaultRegion() {
    try {
      const lang = (navigator.language || "").toLowerCase();
      if (lang.startsWith("en-gb") || lang.startsWith("en-ie")) return "uk";
      if (lang.startsWith("en-au")) return "au";
      if (lang.startsWith("en-ca") || lang.startsWith("fr-ca")) return "ca";
      return "us";
    } catch {
      return "us";
    }
  }

  function applyRegionPreset(regionKey, opts = {}) {
    const { updateRate = true } = opts;
    const region = REGION_PRESETS[regionKey] || REGION_PRESETS.us;
    currentRegion = regionKey in REGION_PRESETS ? regionKey : "us";
    currentCurrencySymbol = region.currency || "$";

    const rateInput = $("rateInput");
    const hint = $("rateCurrencyHint");
    const select = $("countrySelect");

    if (select && select.value !== currentRegion) {
      select.value = currentRegion;
    }

    if (updateRate && rateInput) {
      rateInput.value = region.rate.toFixed(2);
    }

    if (hint) {
      hint.textContent = `${region.currency} / kWh (typical ${region.label} residential)`;
    }
  }

  function loadSaved() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        // 没有保存过，按浏览器语言猜一个默认区域
        const defRegion = detectDefaultRegion();
        applyRegionPreset(defRegion, { updateRate: true });
        updateHoursDisplay();
        return;
      }
      const data = JSON.parse(raw);

      if (data.lightType) $("lightType").value = data.lightType;
      if (typeof data.powerWatt === "number")
        $("powerInput").value = data.powerWatt;
      if (typeof data.hoursPerDay === "number") {
        $("hoursInput").value = data.hoursPerDay;
        $("hoursRange").value = data.hoursPerDay;
      }
      if (typeof data.days === "number") $("daysInput").value = data.days;
      if (typeof data.rate === "number") $("rateInput").value = data.rate;

      const region = data.region || detectDefaultRegion();
      applyRegionPreset(region, { updateRate: false });

      updateHoursDisplay();
    } catch (e) {
      console.warn("Failed to load saved settings", e);
      const defRegion = detectDefaultRegion();
      applyRegionPreset(defRegion, { updateRate: true });
      updateHoursDisplay();
    }
  }

  function save(values) {
    try {
      const data = {
        lightType: values.lightType,
        powerWatt: values.powerWatt,
        hoursPerDay: values.hoursPerDay,
        days: values.days,
        rate: values.rate,
        region: currentRegion,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn("Failed to save settings", e);
    }
  }

  function updateHoursDisplay() {
    const val = $("hoursInput").value;
    const span = $("hoursDisplay");
    if (!span) return;
    if (!val) {
      span.textContent = "";
    } else {
      span.textContent = `${val} h / day`;
    }
  }

  // 本地计算（用于无 Worker 或 Worker 出错时）
  function localCompute({ lightType, powerWatt, hoursPerDay, days, rate }) {
    const totalCost = (powerWatt / 1000) * hoursPerDay * days * rate;
    let ledCostEstimate = null;
    let savings = null;

    if (lightType === "incandescent") {
      // 假设 LED 比白炽灯省 80% 电
      ledCostEstimate = totalCost * 0.2;
      savings = totalCost - ledCostEstimate;
    }

    return { totalCost, ledCostEstimate, savings };
  }

  function updateResults({
    lightType,
    powerWatt,
    hoursPerDay,
    days,
    rate,
    totalCost,
    ledCostEstimate,
    savings,
    currencySymbol,
  }) {
    const placeholder = $("resultsPlaceholder");
    const container = $("resultsContainer");
    if (placeholder) placeholder.classList.add("hidden");
    if (container) container.classList.remove("hidden");

    const totalEl = $("totalCost");
    const perDayEl = $("perDayCost");
    const rateContext = $("rateContext");
    const savingsBox = $("savingsBox");
    const savingsText = $("savingsText");

    const total = Number(totalCost) || 0;
    const perDay = days ? total / days : 0;
    const symbol = currencySymbol || currentCurrencySymbol || "$";

    if (totalEl)
      totalEl.textContent = `${symbol}${total
        .toFixed(2)
        .toLocaleString("en-US")}`;
    if (perDayEl)
      perDayEl.textContent = `≈ ${symbol}${perDay
        .toFixed(2)
        .toLocaleString("en-US")} per day (${days} days)`;

    if (rateContext) {
      rateContext.textContent = `Based on ${powerWatt} W of lights run for ${hoursPerDay} h/day at ${symbol}${rate.toFixed(
        2
      )} per kWh.`;
    }

    if (lightType === "incandescent" && savingsBox && savingsText) {
      savingsBox.classList.remove("hidden");
      if (typeof savings === "number" && typeof ledCostEstimate === "number") {
        savingsText.textContent = `If you switched these lights to LED, you could cut your lighting cost by about 80%, saving around ${symbol}${savings
          .toFixed(2)
          .toLocaleString(
            "en-US"
          )} this season (your LED cost would be about ${symbol}${ledCostEstimate
          .toFixed(2)
          .toLocaleString("en-US")}).`;
      } else {
        savingsText.textContent =
          "Switching to LED lights could cut your lighting cost by around 80%.";
      }
    } else if (savingsBox) {
      savingsBox.classList.add("hidden");
    }
  }

  async function calculate() {
    const lightType = $("lightType").value || "incandescent";
    const powerWatt = parseFloat($("powerInput").value);
    const hoursPerDay = parseFloat($("hoursInput").value);
    const days = parseInt($("daysInput").value, 10);
    const rate = parseFloat($("rateInput").value);

    if (!powerWatt || !hoursPerDay || !days || !rate) {
      alert("Please fill in all the fields (power, hours, days, rate).");
      return;
    }
    if (powerWatt <= 0 || hoursPerDay <= 0 || days <= 0 || rate <= 0) {
      alert("All values must be positive.");
      return;
    }

    const values = { lightType, powerWatt, hoursPerDay, days, rate };
    save(values);

    let result;
    // 可选：调用 Cloudflare Pages Functions / Workers，如果 404 或失败就本地计算
    try {
      const res = await fetch("/calc-light-cost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lightType,
          powerWatt,
          hoursPerDay,
          days,
          pricePerKWh: rate,
        }),
      });

      if (!res.ok) {
        throw new Error("Worker error");
      }
      result = await res.json();
    } catch (e) {
      console.warn("Worker call failed, falling back to local compute", e);
      result = localCompute(values);
    }

    const { totalCost, ledCostEstimate, savings } = result;
    updateResults({
      ...values,
      totalCost,
      ledCostEstimate,
      savings,
      currencySymbol: currentCurrencySymbol,
    });
  }

  function copySummary() {
    const lightType = $("lightType").value || "incandescent";
    const powerWatt = parseFloat($("powerInput").value);
    const hoursPerDay = parseFloat($("hoursInput").value);
    const days = parseInt($("daysInput").value, 10);
    const rate = parseFloat($("rateInput").value);
    const totalText = $("totalCost")?.textContent || `${currentCurrencySymbol}0.00`;

    const regionPreset = REGION_PRESETS[currentRegion] || REGION_PRESETS.us;
    const regionLabel = regionPreset.label || "your area";
    const symbol = currentCurrencySymbol || regionPreset.currency || "$";

    const summary = `My ${lightType} Christmas lights (${powerWatt} W) running ${hoursPerDay} hours per day for ${days} days at ${symbol}${rate}/kWh in ${regionLabel} will cost about ${totalText} for the season.`;

    const statusEl = $("copyStatus");
    if (!navigator.clipboard) {
      if (statusEl) {
        statusEl.textContent = "Copy not supported in this browser.";
      }
      return;
    }

    navigator.clipboard
      .writeText(summary)
      .then(() => {
        if (statusEl) {
          statusEl.textContent = "Summary copied!";
          setTimeout(() => {
            statusEl.textContent = "";
          }, 2000);
        }
      })
      .catch(() => {
        if (statusEl) {
          statusEl.textContent = "Copy failed, please copy manually.";
        }
      });
  }

  // 计算灯串预估总功率
  function updatePresetWattageDisplay() {
    const incMiniCount = parseInt($("incMiniCount").value || "0", 10) || 0;
    const ledMiniCount = parseInt($("ledMiniCount").value || "0", 10) || 0;
    const incC9Count = parseInt($("incC9Count").value || "0", 10) || 0;
    const ledC9Count = parseInt($("ledC9Count").value || "0", 10) || 0;

    const totalWatt =
      incMiniCount * WATT_PRESETS.incMini +
      ledMiniCount * WATT_PRESETS.ledMini +
      incC9Count * WATT_PRESETS.incC9 +
      ledC9Count * WATT_PRESETS.ledC9;

    const display = $("presetTotalWattage");
    if (display) {
      display.textContent = `Estimated: ${totalWatt} W`;
    }
    return totalWatt;
  }

  function applyPresetWattageToInput() {
    const totalWatt = updatePresetWattageDisplay();
    if (totalWatt > 0 && $("powerInput")) {
      $("powerInput").value = totalWatt;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    loadSaved();
    updateHoursDisplay();

    const hoursInput = $("hoursInput");
    const hoursRange = $("hoursRange");
    if (hoursInput && hoursRange) {
      hoursRange.addEventListener("input", () => {
        hoursInput.value = hoursRange.value;
        updateHoursDisplay();
      });
      hoursInput.addEventListener("input", () => {
        const val = parseFloat(hoursInput.value) || 1;
        const clamped = Math.min(24, Math.max(1, val));
        hoursInput.value = clamped;
        hoursRange.value = clamped;
        updateHoursDisplay();
      });
    }

    // 区域选择变化时，更新电价和货币符号
    const countrySelect = $("countrySelect");
    if (countrySelect) {
      countrySelect.addEventListener("change", () => {
        applyRegionPreset(countrySelect.value, { updateRate: true });
      });
    }

    // 按钮：使用当前区域的典型电价
    const useRegionRateBtn = $("useRegionRateBtn");
    if (useRegionRateBtn) {
      useRegionRateBtn.addEventListener("click", () => {
        applyRegionPreset(currentRegion || "us", { updateRate: true });
      });
    }

    // 灯串预估相关事件
    ["incMiniCount", "ledMiniCount", "incC9Count", "ledC9Count"].forEach(
      (id) => {
        const input = $(id);
        if (input) {
          input.addEventListener("input", () => updatePresetWattageDisplay());
        }
      }
    );
    updatePresetWattageDisplay();

    $("applyPresetWattageBtn")?.addEventListener(
      "click",
      applyPresetWattageToInput
    );

    $("calculateBtn")?.addEventListener("click", calculate);
    $("copySummaryBtn")?.addEventListener("click", copySummary);
  });
})();
