// public/js/daily-detail.js
// -------------------------------------------------------------
// Heart Track - Daily Detail Page Logic
// -------------------------------------------------------------
// This script powers the Daily Detail view. It:
//   • Loads all recent measurements via apiManager.getMeasurements()
//   • Filters them for a single specific date ("YYYY-MM-DD")
//   • Updates the stat cards (min HR, max HR, avg HR, count)
//   • Updates the measurement timeline table
//   • Renders TWO Chart.js graphs:
//       - Heart Rate (BPM) over time  -> <canvas id="dailyHeartChart">
//       - SpO₂ (%) over time         -> <canvas id="dailySpo2Chart">
//   • Visually marks minimum & maximum points on each chart
//   • Supports date selector + “Today” quick button
//
// Notes:
//   • This page requires user authentication (checked via auth.js)
//   • Chart.js is loaded separately (chart.js)
//   • charts.js does NOT control these charts — this file creates
//     its own chart instances to avoid cross-page interference.
//   • Existing charts on the canvases are destroyed before new ones
//     are rendered, so reloading dates is safe.
// -------------------------------------------------------------

(function () {
  // (kept for possible debugging; we now use Chart.getChart(...) instead)
  let dailyChart = null; // UNUSED: legacy reference

  // Format a Date as "h:mm AM/PM"
  function formatTime(date) {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  // Format a Date as "Month D, YYYY"
  function formatLongDate(date) {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString([], {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  // Convert Date → "YYYY-MM-DD" (local time) for the <input type="date">
  function formatDateForInput(date) {
    const d = date instanceof Date ? date : new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  // Convert Date → "YYYY-MM-DD" using LOCAL time (not UTC)
  // Used when deciding whether a measurement belongs to the selected day.
  function formatDateLocalYMD(date) {
    const d = date instanceof Date ? date : new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  // -------------------------------------------------------------------
  // Render or update the Chart.js line charts (HR + SpO₂ separately)
  // -------------------------------------------------------------------
  function renderDailyChart(measurements) {
    const hrCanvas = document.getElementById("dailyHeartChart");
    const spo2Canvas = document.getElementById("dailySpo2Chart");

    if (!hrCanvas || !spo2Canvas) {
      console.warn(
        "Daily Detail: expected #dailyHeartChart and #dailySpo2Chart canvases."
      );
      return;
    }

    if (typeof Chart === "undefined") {
      console.warn(
        "Daily Detail: Chart.js not available; charts will not render."
      );
      return;
    }

    // Destroy any existing charts on these canvases (from previous date loads)
    const existingHr = Chart.getChart(hrCanvas);
    if (existingHr) existingHr.destroy();
    const existingSpo2 = Chart.getChart(spo2Canvas);
    if (existingSpo2) existingSpo2.destroy();

    // If there's no data, render "empty" charts and bail
    if (!measurements || measurements.length === 0) {
      const emptyConfig = {
        type: "line",
        data: { labels: [], datasets: [] },
        options: { responsive: true, maintainAspectRatio: false },
      };
      new Chart(hrCanvas.getContext("2d"), emptyConfig);
      new Chart(spo2Canvas.getContext("2d"), emptyConfig);
      return;
    }

    const sorted = [...measurements].sort(
      (a, b) => new Date(a.takenAt) - new Date(b.takenAt)
    );

    const labels = sorted.map((m) => formatTime(m.takenAt));
    const hrData = sorted.map((m) => m.heartRate);
    const spo2Data = sorted.map((m) => m.spo2);

    // ---- Helper: find min & max indices for an array of numeric values ----
    function findMinMaxIndices(arr) {
      const numeric = arr
        .map((v, idx) => (typeof v === "number" ? { v, idx } : null))
        .filter(Boolean);

      if (numeric.length === 0) return { minIdx: -1, maxIdx: -1 };

      let min = numeric[0];
      let max = numeric[0];

      numeric.forEach((item) => {
        if (item.v < min.v) min = item;
        if (item.v > max.v) max = item;
      });

      return { minIdx: min.idx, maxIdx: max.idx };
    }

    const { minIdx: hrMinIdx, maxIdx: hrMaxIdx } = findMinMaxIndices(hrData);
    const { minIdx: sMinIdx, maxIdx: sMaxIdx } = findMinMaxIndices(spo2Data);

    // Build per-point radii & colors so min/max stand out visually
    function buildHighlightArrays(length, baseRadius, baseColor, minIdx, maxIdx) {
      const radii = Array(length).fill(baseRadius);
      const colors = Array(length).fill(baseColor);

      // Minimum → green
      if (minIdx >= 0 && minIdx < length) {
        radii[minIdx] = baseRadius + 3;
        colors[minIdx] = "#27ae60";
      }

      // Maximum → red
      if (maxIdx >= 0 && maxIdx < length) {
        radii[maxIdx] = baseRadius + 3;
        colors[maxIdx] = "#e74c3c";
      }

      return { radii, colors };
    }

    const hrHighlight = buildHighlightArrays(
      hrData.length,
      3,
      "#3498db",
      hrMinIdx,
      hrMaxIdx
    );

    const spo2Highlight = buildHighlightArrays(
      spo2Data.length,
      3,
      "#9b59b6",
      sMinIdx,
      sMaxIdx
    );

    // ---- Heart Rate chart ----
    const hrChartConfig = {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Heart Rate (BPM)",
            data: hrData,
            borderColor: "#3498db",
            backgroundColor: "rgba(52, 152, 219, 0.12)",
            fill: true,
            tension: 0.25,
            pointRadius: hrHighlight.radii,
            pointBackgroundColor: hrHighlight.colors,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        scales: {
          x: {
            title: { display: true, text: "Time of day" },
          },
          y: {
            title: { display: true, text: "Heart Rate (BPM)" },
            suggestedMin: 40,
            suggestedMax: 130,
          },
        },
        plugins: {
          legend: {
            display: true,
            position: "bottom",
          },
          tooltip: {
            callbacks: {
              title(items) {
                const idx = items[0].dataIndex;
                const m = sorted[idx];
                return `${formatTime(m.takenAt)} — ${m.deviceId}`;
              },
              label(context) {
                const idx = context.dataIndex;
                const baseLabel = `${context.dataset.label}: ${context.formattedValue}`;
                if (idx === hrMinIdx) return `${baseLabel} (min)`;
                if (idx === hrMaxIdx) return `${baseLabel} (max)`;
                return baseLabel;
              },
            },
          },
        },
      },
    };

    // ---- SpO₂ chart ----
    const spo2ChartConfig = {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "SpO₂ (%)",
            data: spo2Data,
            borderColor: "#9b59b6",
            backgroundColor: "rgba(155, 89, 182, 0.12)",
            fill: true,
            tension: 0.25,
            pointRadius: spo2Highlight.radii,
            pointBackgroundColor: spo2Highlight.colors,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        scales: {
          x: {
            title: { display: true, text: "Time of day" },
          },
          y: {
            title: { display: true, text: "SpO₂ (%)" },
            suggestedMin: 88,
            suggestedMax: 100,
          },
        },
        plugins: {
          legend: {
            display: true,
            position: "bottom",
          },
          tooltip: {
            callbacks: {
              title(items) {
                const idx = items[0].dataIndex;
                const m = sorted[idx];
                return `${formatTime(m.takenAt)} — ${m.deviceId}`;
              },
              label(context) {
                const idx = context.dataIndex;
                const baseLabel = `${context.dataset.label}: ${context.formattedValue}`;
                if (idx === sMinIdx) return `${baseLabel} (min)`;
                if (idx === sMaxIdx) return `${baseLabel} (max)`;
                return baseLabel;
              },
            },
          },
        },
      },
    };

    // Create both charts
    new Chart(hrCanvas.getContext("2d"), hrChartConfig);
    new Chart(spo2Canvas.getContext("2d"), spo2ChartConfig);
  }

  // -------------------------------------------------------------------
  // Fill cards, table, and charts for a given day
  // -------------------------------------------------------------------
  function updateDailyUI(dateStr, measurements) {
    const minHrEl = document.getElementById("minHeartRate");
    const avgHrEl = document.getElementById("avgHeartRate");
    const maxHrEl = document.getElementById("maxHeartRate");
    const countEl = document.getElementById("measurementsCount");

    const minHrTimeEl = document.getElementById("minHrTime");
    const avgHrInfoEl = document.getElementById("avgHrInfo");
    const maxHrTimeEl = document.getElementById("maxHrTime");
    const measurementsDevicesEl =
      document.getElementById("measurementsDevices");

    const tableBody = document.querySelector(
      "#daily-measurements-table tbody"
    );
    const emptyMessage = document.getElementById("dailyEmptyMessage");
    const aboutTextEl = document.getElementById("dailySummaryText");

    if (
      !minHrEl ||
      !avgHrEl ||
      !maxHrEl ||
      !countEl ||
      !tableBody ||
      !emptyMessage
    ) {
      console.warn(
        "Daily Detail: expected DOM elements not found; cannot update UI."
      );
      return;
    }

    // No measurements → reset UI, show empty state
    if (!measurements || measurements.length === 0) {
      minHrEl.textContent = "--";
      avgHrEl.textContent = "--";
      maxHrEl.textContent = "--";
      countEl.textContent = "0";

      minHrTimeEl && (minHrTimeEl.textContent = "--");
      avgHrInfoEl && (avgHrInfoEl.textContent = "--");
      maxHrTimeEl && (maxHrTimeEl.textContent = "--");
      measurementsDevicesEl && (measurementsDevicesEl.textContent = "--");

      tableBody.innerHTML = "";
      emptyMessage.style.display = "block";

      if (aboutTextEl) {
        aboutTextEl.textContent =
          "No measurements were found for this date. Try another day or confirm your device is sending data.";
      }

      renderDailyChart([]);
      return;
    }

    // We have data
    emptyMessage.style.display = "none";

    const sorted = [...measurements].sort(
      (a, b) => new Date(a.takenAt) - new Date(b.takenAt)
    );

    const heartRates = sorted.map((m) => m.heartRate);
    const minHr = Math.min(...heartRates);
    const maxHr = Math.max(...heartRates);
    const avgHr =
      heartRates.reduce((sum, v) => sum + v, 0) / heartRates.length;

    const minIdx = heartRates.indexOf(minHr);
    const maxIdx = heartRates.indexOf(maxHr);
    const minTime = sorted[minIdx].takenAt;
    const maxTime = sorted[maxIdx].takenAt;

    const deviceIds = new Set(sorted.map((m) => m.deviceId));

    // Stat cards
    minHrEl.textContent = `${minHr}`;
    avgHrEl.textContent = `${Math.round(avgHr)}`;
    maxHrEl.textContent = `${maxHr}`;
    countEl.textContent = `${sorted.length}`;

    minHrTimeEl &&
      (minHrTimeEl.textContent = `Lowest at ${formatTime(minTime)}`);
    maxHrTimeEl &&
      (maxHrTimeEl.textContent = `Highest at ${formatTime(maxTime)}`);
    avgHrInfoEl &&
      (avgHrInfoEl.textContent = `Across ${sorted.length} measurements`);
    measurementsDevicesEl &&
      (measurementsDevicesEl.textContent = `${sorted.length} measurements from ${deviceIds.size} device(s)`);

    if (aboutTextEl) {
      aboutTextEl.textContent = `Showing ${sorted.length} measurements on ${formatLongDate(
        new Date(dateStr + "T00:00:00")
      )}.`;
    }

    // Table
    tableBody.innerHTML = "";
    sorted.forEach((m) => {
      const row = document.createElement("tr");

      const timeTd = document.createElement("td");
      timeTd.textContent = formatTime(m.takenAt);

      const deviceTd = document.createElement("td");
      deviceTd.textContent = m.deviceId;

      const hrTd = document.createElement("td");
      hrTd.textContent = m.heartRate;

      const spo2Td = document.createElement("td");
      spo2Td.textContent = m.spo2;

      row.appendChild(timeTd);
      row.appendChild(deviceTd);
      row.appendChild(hrTd);
      row.appendChild(spo2Td);

      tableBody.appendChild(row);
    });

    // Charts
    renderDailyChart(sorted);
  }

  // -------------------------------------------------------------------
  // Load all recent measurements, then filter for the chosen day
  // -------------------------------------------------------------------
  async function loadDailyData(dateStr) {
    const apiManager = window.apiManager;
    const authManager = window.authManager;

    if (!authManager || !authManager.isAuthenticated()) {
      console.warn(
        "User is not authenticated on Daily Detail page. Redirecting to login."
      );
      window.location.href = "login.html";
      return;
    }

    if (!apiManager || typeof apiManager.getMeasurements !== "function") {
      console.warn("Daily Detail: apiManager.getMeasurements is missing.");
      return;
    }

    console.log("Daily Detail: loading data for", dateStr);

    try {
      const allMeasurements = await apiManager.getMeasurements({ limit: 500 });

      // Compare using LOCAL date (fixes UTC vs local mismatch)
      const filtered = allMeasurements.filter((m) => {
        const key = formatDateLocalYMD(m.takenAt || m.createdAt);
        return key === dateStr;
      });

      console.log(
        `Daily Detail: ${filtered.length} measurements matched ${dateStr} (out of ${allMeasurements.length})`
      );

      updateDailyUI(dateStr, filtered);
    } catch (err) {
      console.error("Daily Detail: error fetching data:", err);
      updateDailyUI(dateStr, []); // show empty state
    }
  }

  // -------------------------------------------------------------------
  // Hook up DOM on page load
  // -------------------------------------------------------------------
  document.addEventListener("DOMContentLoaded", () => {
    console.log("daily-detail.js loaded");

    const dateInput = document.getElementById("dailyDate");
    const todayBtn = document.getElementById("todayBtn");

    if (!dateInput) {
      console.warn("Daily Detail: no #dailyDate input found.");
      return;
    }

    // Default to today
    const today = new Date();
    const todayStr = formatDateForInput(today);
    if (!dateInput.value) {
      dateInput.value = todayStr;
    }

    // Initial load
    loadDailyData(dateInput.value);

    // When user changes date
    dateInput.addEventListener("change", () => {
      if (dateInput.value) {
        loadDailyData(dateInput.value);
      }
    });

    // "Today" button
    if (todayBtn) {
      todayBtn.addEventListener("click", () => {
        dateInput.value = todayStr;
        loadDailyData(todayStr);
      });
    }
  });
})();
