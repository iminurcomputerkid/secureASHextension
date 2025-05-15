// options.js

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('options-form');
  const apiUrlInput = document.getElementById('api-url');
  const autoLockInput = document.getElementById('auto-lock');
  const status = document.getElementById('status');

  // Load saved options (with defaults)
  chrome.storage.sync.get(
    {
      apiUrl: 'https://secure-asf-password-manager.onrender.com',
      autoLock: 15
    },
    (items) => {
      apiUrlInput.value = items.apiUrl;
      autoLockInput.value = items.autoLock;
    }
  );

  // Save options on form submit
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const apiUrl = apiUrlInput.value.trim();
    const autoLock = parseInt(autoLockInput.value, 10) || 15;

    chrome.storage.sync.set({ apiUrl, autoLock }, () => {
      status.textContent = 'Options saved.';
      setTimeout(() => {
        status.textContent = '';
      }, 2000);
    });
  });
});
