// public/js/weekly-summary.js
// -------------------------------------------------------------
// Heart Track - Weekly Summary Page Logic
// -------------------------------------------------------------
// This script powers the Weekly Summary view and is responsible for:
//   • Calling the backend /api/measurements/weekly endpoint (with
//     auth headers from AuthManager) to retrieve one week of
//     aggregate heart-rate and SpO₂ data.
//   • Populating the four top summary cards with weekly averages,
//     total measurements, and active device count.
//   • Filling the “Daily Breakdown” table with per-day min / max /
//     average heart rate, average SpO₂, and measurement counts.
//   • Rendering a Chart.js line chart that plots average heart
//     rate and SpO₂ across the days of the selected week.
//   • Reacting to changes on the <select id="weekSelect"> so the
//     page can be extended later to support multiple week ranges.
//
// NOTE: If key DOM elements or Chart.js are missing, the script
// will log a warning and safely skip the corresponding features.
// -------------------------------------------------------------

(function () {
  console.log('weekly-summary.js loaded');

  document.addEventListener('DOMContentLoaded', () => {
    const weekSelect = document.getElementById('weekSelect');
    const avgHrEl = document.getElementById('avgHeartRateValue');
    const avgSpo2El = document.getElementById('avgSpo2Value');
    const totalMeasEl = document.getElementById('totalMeasurementsValue');
    const activeDevicesEl = document.getElementById('activeDevicesValue');
    const weeklyMinHrEl = document.getElementById('weeklyMinHeartRate');
    const weeklyMaxHrEl = document.getElementById('weeklyMaxHeartRate');
    const weeklyRangeTextEl = document.getElementById('weeklyHrRangeText');

    const breakdownBody = document.getElementById('weekly-breakdown-body');
    const chartCanvas = document.getElementById('weeklyHeartRateChart');

    // Basic sanity check: if key DOM pieces are missing, bail out.
    if (
      !weekSelect ||
      !avgHrEl ||
      !avgSpo2El ||
      !totalMeasEl ||
      !activeDevicesEl
    ) {
      console.warn(
        'Required DOM elements missing on Weekly Summary page; script will not run fully.'
      );
      return;
    }

    // We reuse the same auth + API helpers as other pages.
    const apiManager = new APIManager();
    const authManager = new AuthManager('/api/auth');
    console.log('apiManager on Weekly page:', apiManager);
    console.log('authManager on Weekly page:', authManager);

    // If the user isn't logged in, we *do not* redirect here
    // (you can change this later if needed). For now, we just
    // warn and the fetch will likely 401.
    if (!authManager.isAuthenticated()) {
      console.warn(
        'User is not authenticated on Weekly page. API calls may return 401.'
      );
    }

    let weeklyChart = null;

    // ------------------------------------------------------------------
    // Fetch weekly summary from backend
    // ------------------------------------------------------------------
    async function loadWeeklySummary() {
      try {
        const response = await fetch('/api/measurements/weekly', {
          method: 'GET',
          headers: authManager.getAuthHeaders()
        });

        console.log('Weekly summary response object:', response);

        if (!response.ok) {
          throw new Error(
            `Weekly summary HTTP ${response.status}: ${response.statusText}`
          );
        }

        const summary = await response.json();
        console.log('Weekly summary JSON payload:', summary);

        updateCards(summary);
        updateTable(summary);
        renderChart(summary);
      } catch (err) {
        console.error('Failed to load weekly summary:', err);
      }
    }

    // ------------------------------------------------------------------
    // Update the top four cards
    // ------------------------------------------------------------------
    function updateCards(summary) {
      const hr = summary.averageHeartRate;
      const spo2 = summary.averageSpO2;
      const total = summary.totalMeasurements;
      const devices = summary.activeDevices;

      avgHrEl.textContent = hr != null ? `${hr}` : '--';
      avgSpo2El.textContent = spo2 != null ? `${spo2}` : '--';
      totalMeasEl.textContent = total != null ? `${total}` : '--';
      activeDevicesEl.textContent = devices != null ? `${devices}` : '--';

      // ---- compute global min/max HR over the last 7 days ----
      const daily = Array.isArray(summary.daily) ? summary.daily : [];

      let globalMin = null;
      let globalMax = null;

      daily.forEach((day) => {
        if (typeof day.minHeartRate === 'number') {
          globalMin =
            globalMin === null
              ? day.minHeartRate
              : Math.min(globalMin, day.minHeartRate);
        }
        if (typeof day.maxHeartRate === 'number') {
          globalMax =
            globalMax === null
              ? day.maxHeartRate
              : Math.max(globalMax, day.maxHeartRate);
        }
      });

      if (weeklyMinHrEl && weeklyMaxHrEl) {
        if (globalMin === null || globalMax === null) {
          // No data at all for 7-day window
          weeklyMinHrEl.textContent = '--';
          weeklyMaxHrEl.textContent = '--';

          if (weeklyRangeTextEl) {
            weeklyRangeTextEl.textContent =
              'No heart rate data was recorded in the last 7 days.';
          }
        } else {
          weeklyMinHrEl.textContent = `${globalMin}`;
          weeklyMaxHrEl.textContent = `${globalMax}`;

          if (weeklyRangeTextEl) {
            weeklyRangeTextEl.textContent =
              `In the last 7 days, your heart rate ranged from ${globalMin} to ${globalMax} BPM.`;
          }
        }
      }
    }

    // ------------------------------------------------------------------
    // Fill the daily breakdown table
    // ------------------------------------------------------------------
    function updateTable(summary) {
      if (!breakdownBody) {
        console.warn('No #weekly-breakdown-body found; cannot populate table.');
        return;
      }

      breakdownBody.innerHTML = '';

      const daily = summary.daily || [];

      daily.forEach(day => {
        const tr = document.createElement('tr');

        const dateLabel = new Date(day.date).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        });

        const tdDate = document.createElement('td');
        tdDate.textContent = dateLabel;

        const tdMinHr = document.createElement('td');
        tdMinHr.textContent =
          day.minHeartRate != null ? day.minHeartRate : '—';

        const tdMaxHr = document.createElement('td');
        tdMaxHr.textContent =
          day.maxHeartRate != null ? day.maxHeartRate : '—';

        const tdAvgHr = document.createElement('td');
        tdAvgHr.textContent =
          day.avgHeartRate != null ? Math.round(day.avgHeartRate) : '—';

        const tdAvgSpo2 = document.createElement('td');
        tdAvgSpo2.textContent =
          day.avgSpO2 != null ? Math.round(day.avgSpO2) : '—';

        const tdCount = document.createElement('td');
        tdCount.textContent = day.count != null ? day.count : 0;

        tr.appendChild(tdDate);
        tr.appendChild(tdMinHr);
        tr.appendChild(tdMaxHr);
        tr.appendChild(tdAvgHr);
        tr.appendChild(tdAvgSpo2);
        tr.appendChild(tdCount);

        breakdownBody.appendChild(tr);
      });
    }

    // ------------------------------------------------------------------
    // Render the chart using Chart.js
    // ------------------------------------------------------------------
    function renderChart(summary) {
      if (!chartCanvas || !window.Chart) {
        console.warn(
          'Chart.js is not available or chart canvas missing on Weekly page.'
        );
        return;
      }

      const ctx = chartCanvas.getContext('2d');
      const daily = summary.daily || [];

      const labels = daily.map(day =>
        new Date(day.date).toLocaleDateString('en-US', {
          weekday: 'short'
        })
      );

      const hrData = daily.map(day =>
        day.avgHeartRate != null ? Math.round(day.avgHeartRate) : null
      );

      const spo2Data = daily.map(day =>
        day.avgSpO2 != null ? Math.round(day.avgSpO2) : null
      );

      if (weeklyChart) {
        weeklyChart.destroy();
      }

      weeklyChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Average Heart Rate (BPM)',
              data: hrData,
              borderWidth: 2,
              tension: 0.3,
              pointRadius: 4
            },
            {
              label: 'Average SpO₂ (%)',
              data: spo2Data,
              borderWidth: 2,
              tension: 0.3,
              pointRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false
          },
          plugins: {
            legend: {
              display: true
            },
            tooltip: {
              enabled: true
            }
          },
          scales: {
            y: {
              beginAtZero: false
            }
          }
        }
      });
    }

    // ------------------------------------------------------------------
    // Event handlers
    // ------------------------------------------------------------------
    weekSelect.addEventListener('change', () => {
      // For now we only have "this week", but we keep this here
      // so it's easy to extend in the future.
      loadWeeklySummary();
    });

    // Initial load
    loadWeeklySummary();
  });
})();
