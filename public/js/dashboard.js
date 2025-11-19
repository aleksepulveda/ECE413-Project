// public/js/dashboard.js

console.log('dashboard.js loaded');

document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOMContentLoaded fired on dashboard');

  const api = window.apiManager;
  const auth = window.authManager;
  const tbody = document.querySelector('#measurements-table tbody');

  console.log('apiManager:', api);
  console.log('authManager:', auth);
  console.log('tbody found?', !!tbody);

  // 🔍 NEW debug lines:
  const token = auth && auth.getToken ? auth.getToken() : null;
  console.log('auth token from authManager.getToken():', token);
  console.log('isAuthenticated():', auth && auth.isAuthenticated ? auth.isAuthenticated() : 'no isAuthenticated');

  if (!tbody) {
    console.error('No #measurements-table tbody found');
    return;
  }

  // 🚧 TEMP: do NOT redirect yet, just log
  if (!auth || !auth.isAuthenticated || !auth.isAuthenticated()) {
    console.warn('Not authenticated in dashboard (but continuing for debug)');
    // don't redirect here
  }

  try {
    // GET /api/measurements for this user
    const measurements = await api.getMeasurements(); // use default behavior

    console.log('Loaded measurements from API:', measurements);

    if (!measurements || measurements.length === 0) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 4;
      cell.textContent = 'No measurements yet.';
      row.appendChild(cell);
      tbody.appendChild(row);
      return;
    }

    measurements.forEach(m => {
      const row = document.createElement('tr');

      const time = new Date(m.takenAt || m.createdAt);
      const timeCell = document.createElement('td');
      timeCell.textContent = time.toLocaleString();

      const deviceCell = document.createElement('td');
      deviceCell.textContent = m.deviceId || '';

      const hrCell = document.createElement('td');
      hrCell.textContent = m.heartRate;

      const spo2Cell = document.createElement('td');
      spo2Cell.textContent = m.spo2;

      row.appendChild(timeCell);
      row.appendChild(deviceCell);
      row.appendChild(hrCell);
      row.appendChild(spo2Cell);

      tbody.appendChild(row);
    });
  } catch (err) {
    console.error('Failed to load measurements in dashboard.js:', err);
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 4;
    cell.textContent = 'Error loading measurements.';
    row.appendChild(cell);
    tbody.appendChild(row);
  }
});
