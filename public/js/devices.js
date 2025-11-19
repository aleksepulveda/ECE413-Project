// public/js/devices.js
// Handles the Device Management page:
//  - Loads registered devices for the logged-in user
//  - Allows adding a new device via the form

console.log('devices.js loaded');

document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOMContentLoaded fired on devices page');

  // Re-use the same managers we use on the dashboard
  const authManager = window.authManager || new AuthManager('/api/auth');
  const apiManager = window.apiManager || new APIManager();

  console.log('authManager in devices.js:', authManager);
  console.log(
    'isAuthenticated() on devices page:',
    typeof authManager.isAuthenticated === 'function'
      ? authManager.isAuthenticated()
      : 'no isAuthenticated()'
  );

  // IMPORTANT:
  // For now we DO NOT redirect if not authenticated.
  // (The redirect was what caused the "flash then back to login".)
  //
  // if (!authManager.isAuthenticated()) {
  //   console.warn('Not authenticated on Devices page, redirecting to login');
  //   window.location.href = 'login.html';
  //   return;
  // }

  // ---- Grab DOM elements ----
  const tableBody = document.querySelector('#devices-table tbody');
  const emptyMessage = document.getElementById('devicesEmptyMessage');
  const addDeviceForm = document.getElementById('addDeviceForm');
  const deviceNameInput = document.getElementById('deviceName');
  const deviceIdInput = document.getElementById('deviceId');
  const errorEl = document.getElementById('deviceMessage');
  const successEl = document.getElementById('deviceSuccess');

  if (!tableBody || !addDeviceForm) {
    console.warn('devices.js: required DOM elements not found');
    return;
  }

  // Utility: show error / success messages
  function showError(msg) {
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.style.display = 'block';
    }
    if (successEl) {
      successEl.style.display = 'none';
    }
  }

  function showSuccess(msg) {
    if (successEl) {
      successEl.textContent = msg;
      successEl.style.display = 'block';
    }
    if (errorEl) {
      errorEl.style.display = 'none';
    }
  }

  function clearMessages() {
    if (errorEl) errorEl.style.display = 'none';
    if (successEl) successEl.style.display = 'none';
  }

  // ---- Render devices into the table ----
  function renderDevices(devices) {
    // Clear existing rows
    tableBody.innerHTML = '';

    if (!devices || devices.length === 0) {
      if (emptyMessage) emptyMessage.style.display = 'block';
      return;
    }

    if (emptyMessage) emptyMessage.style.display = 'none';

    devices.forEach((device) => {
      const tr = document.createElement('tr');

      const nameTd = document.createElement('td');
      nameTd.textContent = device.name || '(no name)';

      const idTd = document.createElement('td');
      idTd.textContent = device.deviceId || device.id || '(no id)';

      const createdTd = document.createElement('td');
      const dateStr = device.createdAt
        ? new Date(device.createdAt).toLocaleString()
        : '--';
      createdTd.textContent = dateStr;

      tr.appendChild(nameTd);
      tr.appendChild(idTd);
      tr.appendChild(createdTd);

      tableBody.appendChild(tr);
    });
  }

  // ---- Load devices from API ----
  async function loadDevices() {
    clearMessages();

    try {
      const data = await apiManager.getDevices();
      // Depending on how the backend responds, data might be:
      //   [ {..}, {..} ]  OR  { devices: [..] }
      const devices = Array.isArray(data) ? data : data.devices || [];
      console.log('Loaded devices from API:', devices);
      renderDevices(devices);
    } catch (err) {
      console.error('Error loading devices:', err);
      showError('Error loading devices. Please try again.');
    }
  }

  // ---- Handle "Add Device" form submit ----
  addDeviceForm.addEventListener('submit', async (evt) => {
    evt.preventDefault();
    clearMessages();

    const name = deviceNameInput.value.trim();
    const deviceId = deviceIdInput.value.trim();

    if (!name || !deviceId) {
      showError('Please enter both a device name and device ID.');
      return;
    }

    try {
      const payload = { name, deviceId };
      console.log('Registering new device with payload:', payload);

      await apiManager.registerDevice(payload);

      showSuccess('Device registered successfully.');

      // Clear inputs
      deviceNameInput.value = '';
      deviceIdInput.value = '';

      // Reload table
      await loadDevices();
    } catch (err) {
      console.error('Error registering device:', err);
      showError(err.message || 'Failed to register device.');
    }
  });

  // Initial load
  await loadDevices();
});
