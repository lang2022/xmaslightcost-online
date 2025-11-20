// assets/js/turkey-thaw.js
(function () {
  let countdownTimer = null;
  let countdownStart = null;
  let countdownEnd = null;

  function $(id) {
    return document.getElementById(id);
  }

  function setMethodHint(method) {
    const hint = $("methodHint");
    if (!hint) return;
    if (method === "coldWater") {
      hint.textContent =
        "Cold-water thawing: about 30 minutes per pound. Keep the turkey in a leak-proof bag and change the water every 30 minutes.";
    } else {
      hint.textContent =
        "Fridge thawing: about 24 hours for every 4–5 lb, keeping the turkey at or below 40°F (4°C).";
    }
  }

  function formatDuration(hoursTotal) {
    const totalMinutes = Math.round(hoursTotal * 60);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;

    const parts = [];
    if (days > 0) parts.push(`${days} day${days > 1 ? "s" : ""}`);
    if (hours > 0) parts.push(`${hours} hour${hours > 1 ? "s" : ""}`);
    if (minutes > 0 && days === 0) {
      // 只有在天为 0 时才展示分钟，防止太啰嗦
      parts.push(`${minutes} min`);
    }

    return parts.join(" ");
  }

  function formatDateTime(dt) {
    if (!dt) return "";
    return dt.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function startCountdown() {
    if (!countdownStart || !countdownEnd) return;

    const section = $("countdownSection");
    const textEl = $("countdownText");
    const bar = $("countdownBar");
    if (!section || !textEl || !bar) return;

    section.classList.remove("hidden");

    if (countdownTimer) clearInterval(countdownTimer);

    countdownTimer = setInterval(() => {
      const now = new Date();
      const total = countdownEnd - countdownStart;
      const remaining = countdownEnd - now;

      if (remaining <= 0 || total <= 0) {
        bar.style.width = "100%";
        textEl.textContent =
          "Your turkey should be fully thawed according to the schedule. Always double-check internal temperature before cooking.";
        clearInterval(countdownTimer);
        countdownTimer = null;
        return;
      }

      const remainingHours = remaining / (1000 * 60 * 60);
      const text = formatDuration(remainingHours);

      const progress = Math.min(
        1,
        Math.max(0, 1 - remaining / total)
      );
      bar.style.width = `${progress * 100}%`;
      textEl.textContent = `Approximate time remaining until thawed: ${text}`;
    }, 1000);
  }

  function calculateThaw() {
    const weightInput = $("weightInput");
    const unitSelect = $("weightUnit");
    const methodSelect = $("methodSelect");
    const targetInput = $("targetTimeInput");

    const weight = parseFloat(weightInput.value);
    if (!weight || weight <= 0) {
      alert("Please enter a valid turkey weight.");
      return;
    }

    const unit = unitSelect.value;
    let weightLb = weight;
    if (unit === "kg") {
      weightLb = weight * 2.20462;
    }

    const method = methodSelect.value;

    // 计算总解冻时间（小时）
    let thawHours;
    if (method === "coldWater") {
      // 每磅约 0.5 小时
      thawHours = weightLb * 0.5;
    } else {
      // 冰箱：每 4 lb 24 小时，取稍微保守一点
      const days = Math.ceil(weightLb / 4);
      thawHours = days * 24;
    }

    const placeholder = $("thawPlaceholder");
    const results = $("thawResults");
    if (placeholder) placeholder.classList.add("hidden");
    if (results) results.classList.remove("hidden");

    $("thawTotalTime").textContent = formatDuration(thawHours);

    // 食品安全提示
    const safetyText = $("safetyText");
    if (method === "coldWater") {
      safetyText.textContent =
        "Cold-water thawing should be done in a leak-proof plastic bag, fully submerged, with the water changed every 30 minutes. Cook the turkey immediately after thawing.";
    } else {
      safetyText.textContent =
        "Fridge thawing keeps the turkey at a safe temperature (at or below 40°F / 4°C). Once thawed, cook within 1–2 days.";
    }

    const targetValue = targetInput.value;
    const startEl = $("thawStartTime");
    const noteEl = $("thawServingNote");

    const now = new Date();
    countdownStart = null;
    countdownEnd = null;

    if (targetValue) {
      const targetDate = new Date(targetValue);
      if (isNaN(targetDate.getTime())) {
        startEl.textContent =
          "Invalid target time. Please check the date and time format.";
        noteEl.textContent = "";
        return;
      }

      const bufferHours = 4; // 额外预留准备+烹饪时间
      const thawEnd = new Date(targetDate.getTime() - bufferHours * 3600000);
      const thawStart = new Date(thawEnd.getTime() - thawHours * 3600000);

      startEl.textContent = formatDateTime(thawStart);
      noteEl.textContent = `This allows about ${bufferHours} hours after thawing for prep and cooking before your target serving time.`;

      countdownStart = thawStart;
      countdownEnd = thawEnd;

      if (now < thawStart) {
        // 尚未开始解冻
        $("countdownText").textContent =
          "Thawing hasn't started yet based on this schedule.";
      } else if (now >= thawStart && now < thawEnd) {
        // 正在解冻中
        $("countdownText").textContent =
          "Your turkey should currently be in the thawing window.";
      } else {
        $("countdownText").textContent =
          "Your planned thaw time has already passed. Double-check if the turkey is fully thawed.";
      }

      startCountdown();
    } else {
      startEl.textContent = "Start as soon as possible.";
      noteEl.textContent =
        "Without a specific serving time, this is only a rough thawing duration. Always allow extra time when you can.";
      const section = $("countdownSection");
      if (section) section.classList.add("hidden");
      if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
      }
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const methodSelect = $("methodSelect");
    const calcBtn = $("thawCalcBtn");

    if (methodSelect) {
      setMethodHint(methodSelect.value);
      methodSelect.addEventListener("change", () =>
        setMethodHint(methodSelect.value)
      );
    }

    if (calcBtn) {
      calcBtn.addEventListener("click", calculateThaw);
    }
  });
})();
