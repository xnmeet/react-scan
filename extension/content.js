const script = document.createElement('script');
script.src = 'https://unpkg.com/react-scan/dist/auto.global.js';
script.dataset.extension = 'react-scan';

const firstScript = document.documentElement.getElementsByTagName('script')[0];
firstScript?.parentNode?.insertBefore(script, firstScript) ||
  document.documentElement.appendChild(script);

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'OPEN_PANEL') {
    window.dispatchEvent(new CustomEvent('react-scan:toggle-panel'));
  }
});

window.addEventListener('react-scan:update', (event) => {
  chrome.runtime.sendMessage({
    type: 'SCAN_UPDATE',
    ...event.detail
  });
});
