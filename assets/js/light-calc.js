// assets/js/light-calc.js
(function () {
  const STORAGE_KEY = "xmas-light-cost-settings";

  function $(id) {
    return document.getElementById(id);
  }

  function loadSaved() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
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
      updateHoursDisplay();
    } catch (e) {
      console.warn("Failed to load saved settings", e);
    }
  }

  function save(values) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
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

  function localCompute({ lightType, powerWatt, hoursPerDay, days, rate }) {
    const totalCost = (powerWatt / 1000) * hoursPerDay * days * rate;
    let ledCostEstimate = null;
    let savings = null;

    if (lightType === "incandescent") {
      // 假设 LED 省 80% 电
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
  }) {
    const placeholder = $("resultsPlaceholder");
    const container = $("resultsContainer");
    if (placeholder) placeholder.classList.add("hidden");
    if (container) container.classList.remove("hidden");

    const totalEl = $("totalCost");
    const perDayEl = $("perDayCost");
    const savingsBox = $("savingsBox");
    const savingsText = $("savingsText");

    const total = Number(totalCost) || 0;
    const perDay = days ? total / days : 0;

    if (totalEl)
      totalEl.textContent = `$${total.toFixed(2).toLocaleString("en-US")}`;
    if (perDayEl)
      perDayEl.textContent = `≈ $${perDay.toFixed(
        2
      )} per day (${days} days)`;

    if (lightType === "incandescent" && savingsBox && savingsText) {
      savingsBox.classList.remove("hidden");
      if (typeof savings === "number" && typeof ledCostEstimate === "number") {
        savingsText.textContent = `If you switched these lights to LED, you could cut your lighting cost by about 80%, saving around $${savings
          .toFixed(2)
          .toLocaleString(
            "en-US"
          )} this season (your LED cost would be about $${ledCostEstimate
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
    const lightType = $("lightType").value;
    const powerWatt = parseFloat($("powerInput").value);
    const hoursPerDay = parseFloat($("hoursInput").value);
    const days = parseInt($("daysInput").value, 10);
    const rate = parseFloat($("rateInput").value);

    if (!powerWatt || !hoursPerDay || !days || !rate) {
      alert("Please fill in all the fields.");
      return;
    }
    if (powerWatt <= 0 || hoursPerDay <= 0 || days <= 0 || rate <= 0) {
      alert("All values must be positive.");
      return;
    }

    const values = { lightType, powerWatt, hoursPerDay, days, rate };
    save(values);

    // 先用本地计算，后面再接 Cloudflare Workers API
    const { totalCost, ledCostEstimate, savings } = localCompute(values);
    updateResults({
      ...values,
      totalCost,
      ledCostEstimate,
      savings,
    });
  }

  function copySummary() {
    const lightType = $("lightType").value;
    const powerWatt = parseFloat($("powerInput").value);
    const hoursPerDay = parseFloat($("hoursInput").value);
    const days = parseInt($("daysInput").value, 10);
    const rate = parseFloat($("rateInput").value);
    const totalText = $("totalCost")?.textContent || "$0.00";

    const summary = `My ${lightType} Christmas lights (${powerWatt} W) running ${hoursPerDay} hours per day for ${days} days at $${rate}/kWh will cost about ${totalText} for the season.`;

    const statusEl = $("copyStatus");
    if (!navigator.clipboard) {
      if (statusEl) {
        statusEl.textContent = "Copied text to clipboard (fallback).";
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

  document.addEventListener("DOMContentLoaded", () => {
    const hoursInput = $("hoursInput");
    const hoursRange = $("hoursRange");
    const useAverageRateBtn = $("useAverageRateBtn");

    loadSaved();
    updateHoursDisplay();

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

    if (useAverageRateBtn) {
      useAverageRateBtn.addEventListener("click", () => {
        // 大致的美国平均电价，可以改
        $("rateInput").value = "0.16";
      });
    }

    $("calculateBtn")?.addEventListener("click", calculate);
    $("copySummaryBtn")?.addEventListener("click", copySummary);
  });
})();
