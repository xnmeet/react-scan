async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

document.getElementById('open-panel').addEventListener('click', async () => {
  const tab = await getCurrentTab();
  chrome.tabs.sendMessage(tab.id, { type: 'OPEN_PANEL' });
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SCAN_UPDATE') {
    document.getElementById('react-version').textContent =
      message.reactVersion || '-';
    document.getElementById('component-count').textContent =
      message.componentCount || '0';
    document.getElementById('rerender-count').textContent =
      message.rerenderCount || '0';
    document.getElementById('status').textContent =
      message.status || 'Scanning...';
  }
});
