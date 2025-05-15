// background.js

// Fired when the extension is first installed or updated
chrome.runtime.onInstalled.addListener(() => {
  console.log("Secure ASF Client extension installed.");
});

// You can expand this file to handle context menus, alarms, or notifications.
// For example, to show a notification from your popup:
// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   if (message.type === 'notify') {
//     chrome.notifications.create({
//       type: 'basic',
//       iconUrl: 'icons/icon128.png',
//       title: message.title,
//       message: message.message
//     });
//     sendResponse({ status: 'ok' });
//   }
// });
