let activeTabId = null;
let activeDomain = null;
let startingTime = Date.now();

function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch (error) {
    return null;
  }
}

function updateTime() {
  if (!activeTabId || !activeDomain) return;
  const now = Date.now();
  const elapsed = Math.max(0, now - startingTime);

  if (elapsed <= 0) return;

  chrome.storage.local.get([activeDomain], (result) => {
    const total = (result[activeDomain] || 0) + elapsed;
    chrome.storage.local.set({ [activeDomain]: total });
  });

  startingTime = now;
}

function resetActiveTab() {
    if(activeTabId && activeDomain){
        updateTime();
    }

    activeTabId = null;
    activeDomain = null;
    startingTime = Date.now();
}

chrome.tabs.onActivated.addListener((activeInfo) => {
  const previousTabId = activeTabId;
  const previousDomain = activeDomain;

  activeTabId = activeInfo.tabId;

  chrome.tabs.get(activeTabId, (tab) => {
    if (previousTabId && previousDomain) {
      updateTime();
    }

    activeDomain = tab.url ? getDomain(tab.url) : null;
    startingTime = Date.now();
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tabId === activeTabId && changeInfo.url) {
    updateTime();
    activeDomain = getDomain(changeInfo.url);
    startingTime = Date.now();
  }
});

chrome.alarms.create('saveTime', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'saveTime') {
    updateTime();
  }
});

async function updateBlockedSites() {
  const result = await chrome.storage.local.get("blockedSites");
  const blockedSites = result.blockedSites || [];

  const currentRules = await chrome.declarativeNetRequest.getDynamicRules();
  const currentIds = currentRules.map((rule) => rule.id);

  const rules = blockedSites.map((domain, index) => ({
    id: index + 1,
    priority: 1,
    action: { type: "block" },
    condition: {
      urlFilter: `||${domain}^`,
      resourceTypes: ["main_frame"]
    }
  }));

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: currentIds,
    addRules: rules
  });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.blockedSites) {
    updateBlockedSites();
  }
});

chrome.runtime.onInstalled.addListener(() => {
  updateBlockedSites();
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    resetActiveTab();
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab || !tab.url) {
      resetActiveTab();
      return;
    }

    const nextDomain = getDomain(tab.url);

    if (tab.id !== activeTabId) {
      updateTime();
      activeTabId = tab.id;
      activeDomain = nextDomain;
      startingTime = Date.now();
    }
  });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === activeTabId) {
    resetActiveTab();
  }
});
