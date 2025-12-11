// public/js/settings.js
// -------------------------------------------------------------
// Heart Track - Settings Page Logic
// -------------------------------------------------------------
//  1) Reads the logged-in user from auth.js (heartTrackUser / /api/users/me).
//  2) Calls /api/devices to show how many devices are registered.
//  3) Loads/saves UI preferences (interval, notifications,
//     active hours) in localStorage so they persist per-browser.
//  4) Allows updating profile name and password via /api/users/me
//     (email remains read-only).
// -------------------------------------------------------------

(function () {
  console.log('settings.js loaded');

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('settingsForm');
    if (!form) {
      console.warn('Settings: form not found; skipping settings.js');
      return;
    }

    // ---------- Element lookups ----------
    const accountEmailEl   = document.getElementById('settingsAccountEmail');
    const accountCreatedEl = document.getElementById('settingsAccountCreated');

    const deviceCountEl    = document.getElementById('settingsDeviceCount');
    const deviceHintEl     = document.getElementById('settingsDeviceHint');

    const intervalLabelEl  = document.getElementById('settingsIntervalLabel');
    const intervalHintEl   = document.getElementById('settingsIntervalHint');

    const notifLabelEl     = document.getElementById('settingsNotificationsLabel');
    const notifHintEl      = document.getElementById('settingsNotificationsHint');

    const emailInput       = document.getElementById('settingsEmail');
    const nameInput        = document.getElementById('settingsName');

    const intervalSelect   = document.getElementById('settingsInterval');
    const notifSelect      = document.getElementById('settingsNotifications');
    const startTimeInput   = document.getElementById('settingsStartTime');
    const endTimeInput     = document.getElementById('settingsEndTime');

    const currentPwInput   = document.getElementById('settingsCurrentPassword');
    const newPwInput       = document.getElementById('settingsNewPassword');

    const messageEl        = document.getElementById('settingsMessage');

    if (
      !accountEmailEl || !emailInput ||
      !intervalSelect || !notifSelect ||
      !startTimeInput || !endTimeInput
    ) {
      console.warn(
        'Settings: expected DOM elements not found; cannot initialise UI.'
      );
      return;
    }

    const apiManager  = window.apiManager;
    const authManager = window.authManager;

    // ---------- Helpers ----------
    const PREFS_KEY = 'heartTrackSettings';
    const USER_KEY  = 'heartTrackUser';

    function loadPreferences() {
      try {
        const raw = localStorage.getItem(PREFS_KEY);
        if (!raw) {
          return {
            intervalMinutes: 30,
            notifications: 'on',
            startTime: '06:00',
            endTime: '22:00',
          };
        }
        const parsed = JSON.parse(raw);
        return {
          intervalMinutes: parsed.intervalMinutes ?? 30,
          notifications:   parsed.notifications   ?? 'on',
          startTime:       parsed.startTime       ?? '06:00',
          endTime:         parsed.endTime         ?? '22:00',
        };
      } catch (err) {
        console.error('Settings: error parsing stored preferences', err);
        return {
          intervalMinutes: 30,
          notifications: 'on',
          startTime: '06:00',
          endTime: '22:00',
        };
      }
    }

    function savePreferences(prefs) {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    }

    function formatDateTime(value) {
      if (!value) return '--';
      try {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return '--';
        return d.toLocaleString();
      } catch {
        return '--';
      }
    }

    function updatePreferenceCards(prefs) {
      if (intervalLabelEl) {
        intervalLabelEl.textContent = `Every ${prefs.intervalMinutes} minutes`;
      }
      if (intervalHintEl) {
        intervalHintEl.textContent =
          'This is a demo preference stored in your browser. In a full system, it would configure the device schedule.';
      }

      if (notifLabelEl) {
        notifLabelEl.textContent = prefs.notifications === 'off' ? 'Off' : 'On';
      }
      if (notifHintEl) {
        notifHintEl.textContent =
          prefs.notifications === 'off'
            ? 'Reminders are disabled for this browser.'
            : 'Reminders are enabled for this browser (demo only).';
      }
    }

    function getCurrentUserFromStorage() {
      const fromLocal   = localStorage.getItem(USER_KEY);
      const fromSession = sessionStorage.getItem(USER_KEY);
      const raw = fromLocal || fromSession;
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.warn('Settings: could not parse stored user JSON', e);
        return null;
      }
    }

    async function loadUserProfile() {
      // Prefer real API if authManager + token are available
      if (authManager && typeof authManager.getAuthHeaders === 'function') {
        try {
          const resp = await fetch('/api/users/me', {
            headers: authManager.getAuthHeaders(),
          });

          if (resp.ok) {
            const data = await resp.json();
            const user = data && data.user ? data.user : null;

            if (user) {
              accountEmailEl.textContent = user.email || '--';
              emailInput.value = user.email || '';
              nameInput && (nameInput.value = user.name || '');

              accountCreatedEl.textContent = user.createdAt
                ? `Account created: ${formatDateTime(user.createdAt)}`
                : 'Account creation time not available.';

              // Also sync to storage for other pages if you like
              try {
                localStorage.setItem(USER_KEY, JSON.stringify(user));
              } catch (_) {}
              return;
            }
          }

          console.warn(
            'Settings: /api/users/me did not return user, falling back to local storage.'
          );
        } catch (err) {
          console.warn(
            'Settings: error calling /api/users/me, falling back to local storage.',
            err
          );
        }
      }

      // Fallback: local storage
      const stored = getCurrentUserFromStorage();
      if (stored) {
        accountEmailEl.textContent = stored.email || '--';
        emailInput.value = stored.email || '';
        nameInput && (nameInput.value = stored.name || '');
        accountCreatedEl.textContent = stored.createdAt
          ? `Account created: ${formatDateTime(stored.createdAt)}`
          : 'Account creation time not available.';
      } else {
        accountEmailEl.textContent = '--';
        emailInput.value = '';
        if (nameInput) nameInput.value = '';
        accountCreatedEl.textContent =
          'User information not available. Make sure you are logged in.';
      }
    }

    // ---------- Device count ----------
    if (apiManager && typeof apiManager.getDevices === 'function') {
      apiManager
        .getDevices()
        .then((devices) => {
          if (!Array.isArray(devices)) {
            deviceCountEl.textContent = '--';
            deviceHintEl.textContent = 'Unable to load device information.';
            return;
          }

          const count = devices.length;
          deviceCountEl.textContent = String(count);
          deviceHintEl.textContent =
            count === 1
              ? '1 device linked to this account.'
              : `${count} devices linked to this account.`;
        })
        .catch((err) => {
          console.warn('Settings: error loading devices', err);
          deviceCountEl.textContent = '--';
          deviceHintEl.textContent =
            'Could not load devices (check API / auth).';
        });
    } else {
      deviceCountEl.textContent = '--';
      deviceHintEl.textContent = 'Device API not available in this build.';
    }

    // ---------- Preferences ----------
    const prefs = loadPreferences();

    intervalSelect.value = String(prefs.intervalMinutes);
    notifSelect.value    = prefs.notifications;
    startTimeInput.value = prefs.startTime;
    endTimeInput.value   = prefs.endTime;

    updatePreferenceCards(prefs);

    // ---------- Load profile from API / storage ----------
    loadUserProfile();

    // ---------- Form submission ----------
    form.addEventListener('submit', async (evt) => {
      evt.preventDefault();

      // 1) Collect local preferences (unchanged logic)
      const updatedPrefs = {
        intervalMinutes: Number(intervalSelect.value) || 30,
        notifications:   notifSelect.value === 'off' ? 'off' : 'on',
        startTime:       startTimeInput.value || '06:00',
        endTime:         endTimeInput.value || '22:00',
      };

      savePreferences(updatedPrefs);
      updatePreferenceCards(updatedPrefs);

      // 2) Prepare profile update payload
      const payload = {
        name: nameInput ? nameInput.value.trim() : '',
      };

      const newPw = newPwInput ? newPwInput.value.trim() : '';
      const currentPw = currentPwInput ? currentPwInput.value.trim() : '';

      if (newPw) {
        payload.newPassword = newPw;
        payload.currentPassword = currentPw;
      }

      // Clear message
      if (messageEl) {
        messageEl.style.display = 'none';
        messageEl.textContent = '';
      }

      // 3) Call /api/users/me if possible
      if (authManager && typeof authManager.getAuthHeaders === 'function') {
        try {
          const resp = await fetch('/api/users/me', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              ...authManager.getAuthHeaders(),
            },
            body: JSON.stringify(payload),
          });

          const data = await resp.json().catch(() => ({}));

          if (!resp.ok) {
            const errMsg =
              (data && data.error) ||
              `Failed to update profile (HTTP ${resp.status})`;
            if (messageEl) {
              messageEl.style.display = 'block';
              messageEl.textContent = errMsg;
            }
          } else {
            // Update local user cache
            if (data && data.user) {
              try {
                localStorage.setItem(USER_KEY, JSON.stringify(data.user));
              } catch (_) {}
            }

            // Clear password inputs after successful update
            if (currentPwInput) currentPwInput.value = '';
            if (newPwInput) newPwInput.value = '';

            if (messageEl) {
              messageEl.style.display = 'block';
              messageEl.textContent =
                'Preferences and profile updated successfully.';
            }
          }
        } catch (err) {
          console.error('Settings: error updating profile', err);
          if (messageEl) {
            messageEl.style.display = 'block';
            messageEl.textContent =
              'An error occurred while updating your profile.';
          }
        }
      } else {
        // No authManager – just save local prefs and warn
        if (messageEl) {
          messageEl.style.display = 'block';
          messageEl.textContent =
            'Preferences saved locally. Profile changes require login.';
        }
      }

      // Hide message after a few seconds
      if (messageEl) {
        setTimeout(() => {
          messageEl.style.display = 'none';
        }, 3000);
      }
    });
  });
})();
