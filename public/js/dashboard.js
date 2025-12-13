// public/js/dashboard.js
// -------------------------------------------------------------
// Heart Track - Dashboard Page Logic
// -------------------------------------------------------------
// This script powers the main Dashboard view. It:
//   • Loads recent measurements from the backend via apiManager.getMeasurements()
//   • Filters those measurements by the selected time range
//     ("today", "week", "month") using <select id="timeRange">
//   • Updates the stat cards:
//       - Current Heart Rate
//       - Blood Oxygen
//       - Today's Measurements
//       - Active Devices (via /api/devices)
//   • Populates the “Recent Measurements” table with newest readings first
//   • Sends processed data into chartsManager (charts.js) to render
//     the Heart Rate and Oxygen charts
//   • Enforces login on this page via authManager (auth.js)
//   • Gracefully handles empty data sets and API errors
// -------------------------------------------------------------

(function () {
  console.log('dashboard.js loaded');

  document.addEventListener('DOMContentLoaded', () => {
    const apiManager = window.apiManager;
    const authManager = window.authManager;
    const chartsManager = window.chartsManager;

    if (!apiManager) {
      console.warn('Dashboard: apiManager not available; skipping data load.');
      return;
    }

    // Optional: enforce login on dashboard
    if (authManager && typeof authManager.isAuthenticated === 'function') {
      if (!authManager.isAuthenticated()) {
        console.warn('Dashboard: user not authenticated, redirecting to login.');
        window.location.href = 'login.html';
        return;
      }
    }

    // ---- Core DOM elements (must exist) ----
    const rangeSelect = document.getElementById('timeRange'); // <select>
    const recentTableBody = document.querySelector('#measurements-table tbody');
    const heartRateCanvas = document.getElementById('heartRateChart');
    const oxygenCanvas = document.getElementById('oxygenChart');

    if (!rangeSelect || !recentTableBody || !heartRateCanvas) {
      console.warn(
        'Dashboard: core DOM elements not found (timeRange, measurements-table tbody, or heartRateChart).'
      );
      return;
    }

    // ---- Stat-card elements ----
    const currentHrEl = document.getElementById('currentHeartRate');
    const currentOxygenEl = document.getElementById('currentOxygen');
    const todayCountEl = document.getElementById('todayMeasurements');
    const activeDevicesEl = document.getElementById('activeDevices');

    // ---------------------------------------------------------
    // Helper: figure out measurement timestamp as Date
    // (supports either .takenAt from backend or .timestamp from mock data)
    // ---------------------------------------------------------
    function getMeasurementTime(m) {
      const raw = m.takenAt || m.timestamp;
      const d = raw ? new Date(raw) : null;
      return d && !Number.isNaN(d.getTime()) ? d : null;
    }

    // ---------------------------------------------------------
    // Range filtering: "today", "week", "month"
    // ---------------------------------------------------------
    function filterByRange(measurements, range) {
      if (!Array.isArray(measurements) || measurements.length === 0) {
        return [];
      }

      const now = new Date();
      const startOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
        0
      );

      let start;

      switch (range) {
        case 'today':
          start = startOfToday;
          break;
        case 'week':
          // Last 7 days (including today)
          start = new Date(startOfToday);
          start.setDate(start.getDate() - 6);
          break;
        case 'month':
          // Last 30 days
          start = new Date(startOfToday);
          start.setDate(start.getDate() - 29);
          break;
        default:
          // Unknown range -> no filtering
          return measurements;
      }

      return measurements.filter((m) => {
        const t = getMeasurementTime(m);
        if (!t) return false;
        return t >= start && t <= now;
      });
    }

    // ---------------------------------------------------------
    // Stat cards + table helpers
    // ---------------------------------------------------------
    function updateStatCards(measurements) {
      if (!measurements || measurements.length === 0) {
        if (currentHrEl) currentHrEl.textContent = '--';
        if (currentOxygenEl) currentOxygenEl.textContent = '--';
        if (todayCountEl) todayCountEl.textContent = '0';
        return;
      }

      // Use newest measurement for "Current" stats
      const newest = [...measurements].sort((a, b) => {
        const ta = getMeasurementTime(a) || 0;
        const tb = getMeasurementTime(b) || 0;
        return tb - ta;
      })[0];

      if (currentHrEl) {
        currentHrEl.textContent =
          typeof newest.heartRate === 'number' ? newest.heartRate : '--';
      }

      // Backend uses spo2; mock data uses bloodOxygen
      const spo2Value =
        typeof newest.spo2 === 'number'
          ? newest.spo2
          : typeof newest.bloodOxygen === 'number'
          ? newest.bloodOxygen
          : null;

      if (currentOxygenEl) {
        currentOxygenEl.textContent = spo2Value ?? '--';
      }

      if (todayCountEl) {
        todayCountEl.textContent = String(measurements.length);
      }
    }

    function updateRecentTable(measurements) {
      // States stored in the function itself
      if (!updateRecentTable._state) {
        updateRecentTable._state = {
          pageSize: 10,
          currentPage: 1,
          measurements: [],
          controlsInitialized: false,
          prevBtn: null,
          nextBtn: null,
          infoSpan: null
        };
      }

      const state = updateRecentTable._state;

      // If caller passed an array, treat it as "new data" and reset to page 1
      if (Array.isArray(measurements)) {
        state.measurements = measurements;
        state.currentPage = 1;
      }

      const all = state.measurements || [];
      const total = all.length;

      // Clear table body
      recentTableBody.innerHTML = '';

      // --- create pagination controls once, just under the table ---
      if (!state.controlsInitialized && recentTableBody.parentElement) {
        const wrapper = document.createElement('div');
        wrapper.className = 'table-pagination';

        const prevBtn = document.createElement('button');
        prevBtn.type = 'button';
        prevBtn.textContent = '‹';
        prevBtn.className = 'table-pagination__btn';

        const infoSpan = document.createElement('span');
        infoSpan.className = 'table-pagination__info';

        const nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.textContent = '›';
        nextBtn.className = 'table-pagination__btn';

        wrapper.appendChild(prevBtn);
        wrapper.appendChild(infoSpan);
        wrapper.appendChild(nextBtn);

        // put controls after the table
        const table = recentTableBody.parentElement;        // <table>
        table.parentElement.appendChild(wrapper);           // usually the card section

        // wire events
        prevBtn.addEventListener('click', () => {
          if (state.currentPage > 1) {
            state.currentPage--;
            updateRecentTable(); // no new data, just re-render current cache
          }
        });

        nextBtn.addEventListener('click', () => {
          const totalPages = Math.max(1, Math.ceil(state.measurements.length / state.pageSize));
          if (state.currentPage < totalPages) {
            state.currentPage++;
            updateRecentTable(); // re-render
          }
        });

        state.prevBtn = prevBtn;
        state.nextBtn = nextBtn;
        state.infoSpan = infoSpan;
        state.controlsInitialized = true;
      }

      // If no data, show the original "no measurements" row
      if (!total) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 4;
        cell.textContent = 'No measurements for this range.';
        row.appendChild(cell);
        recentTableBody.appendChild(row);

        if (state.infoSpan) {
          state.infoSpan.textContent = 'Page 0 of 0';
          state.prevBtn.disabled = true;
          state.nextBtn.disabled = true;
        }
        return;
      }

      // Sort newest → oldest (same as before)
      const sortedNewestFirst = [...all].sort((a, b) => {
        const ta = getMeasurementTime(a) || 0;
        const tb = getMeasurementTime(b) || 0;
        return tb - ta;
      });

      const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
      if (state.currentPage > totalPages) {
        state.currentPage = totalPages;
      }

      const startIndex = (state.currentPage - 1) * state.pageSize;
      const endIndex = startIndex + state.pageSize;
      const pageItems = sortedNewestFirst.slice(startIndex, endIndex);

      // Render only this page's items
      pageItems.forEach((m) => {
        const row = document.createElement('tr');

        const t = getMeasurementTime(m);
        const timeText = t
          ? t.toLocaleString([], {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })
          : '--';

        const timeCell = document.createElement('td');
        timeCell.textContent = timeText;

        const deviceCell = document.createElement('td');
        deviceCell.textContent = m.deviceId || 'Device';

        const hrCell = document.createElement('td');
        hrCell.textContent =
          typeof m.heartRate === 'number' ? m.heartRate : '--';

        const spo2Val =
          typeof m.spo2 === 'number'
            ? m.spo2
            : typeof m.bloodOxygen === 'number'
            ? m.bloodOxygen
            : null;

        const spo2Cell = document.createElement('td');
        spo2Cell.textContent = spo2Val ?? '--';

        row.appendChild(timeCell);
        row.appendChild(deviceCell);
        row.appendChild(hrCell);
        row.appendChild(spo2Cell);

        recentTableBody.appendChild(row);
      });

      // Update pagination controls
      if (state.infoSpan) {
        state.infoSpan.textContent = `Page ${state.currentPage} of ${totalPages}`;
        state.prevBtn.disabled = state.currentPage <= 1;
        state.nextBtn.disabled = state.currentPage >= totalPages;
      }
    }

    function updateActiveDevicesCard() {
      if (!activeDevicesEl || !apiManager.getDevices) return;

      apiManager
        .getDevices()
        .then((devices) => {
          if (!Array.isArray(devices)) {
            activeDevicesEl.textContent = '--';
            return;
          }
          activeDevicesEl.textContent = String(devices.length);
        })
        .catch((err) => {
          console.warn(
            'Dashboard: error loading devices for activeDevices card',
            err
          );
          activeDevicesEl.textContent = '--';
        });
    }

    // ---------------------------------------------------------
    // Chart updates via chartsManager (from charts.js)
    // ---------------------------------------------------------
    function updateCharts(measurements) {
      if (!chartsManager) {
        console.warn('Dashboard: chartsManager not available; skipping charts.');
        return;
      }

      // We want chronological order for charts
      const sortedAscending = [...measurements].sort((a, b) => {
        const ta = getMeasurementTime(a) || 0;
        const tb = getMeasurementTime(b) || 0;
        return ta - tb;
      });

      const chartData = sortedAscending.map((m) => {
        const t = getMeasurementTime(m) || new Date();
        const hr = m.heartRate;
        const spo2 =
          typeof m.spo2 === 'number'
            ? m.spo2
            : typeof m.bloodOxygen === 'number'
            ? m.bloodOxygen
            : null;

        return {
          timestamp: t,
          heartRate: hr,
          bloodOxygen: spo2,
          deviceId: m.deviceId || 'Device',
        };
      });

      chartsManager.updateHeartRateChart(chartData);
      chartsManager.updateOxygenChart(chartData);
    }

    // ---------------------------------------------------------
    // Core loader for a given range
    // ---------------------------------------------------------
    async function loadMeasurementsAndRender(rangeValue) {
      const range = rangeValue || rangeSelect.value || 'today';

      try {
        // Ask backend for measurements (optionally passing range).
        // Backend may or may not use the query; we still filter in the browser.
        const payload = await apiManager.getMeasurements({ range });

        // Support two shapes: array OR { measurements: [...] }
        const allMeasurements = Array.isArray(payload)
          ? payload
          : payload && Array.isArray(payload.measurements)
          ? payload.measurements
          : [];

        const filtered = filterByRange(allMeasurements, range);

        updateRecentTable(filtered);
        updateStatCards(filtered);
        updateCharts(filtered);
        updateActiveDevicesCard();
      } catch (err) {
        console.error('Dashboard: failed to load measurements', err);
        updateRecentTable([]);
        updateStatCards([]);
        if (chartsManager) {
          chartsManager.updateHeartRateChart([]);
          chartsManager.updateOxygenChart([]);
        }
      }
    }

    // ---------------------------------------------------------
    // Event wiring
    // ---------------------------------------------------------
    rangeSelect.addEventListener('change', () => {
      loadMeasurementsAndRender(rangeSelect.value);
    });

    // Initial load – use whatever is in the select (default "today")
    loadMeasurementsAndRender(rangeSelect.value);
  });
})();
