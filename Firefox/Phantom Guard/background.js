const predefinedTrackers = [
  { domain: "doubleclick.net", path: "/ads" },
  { domain: "google-analytics.com", path: "/analytics.js" },
  { domain: "facebook.com", path: "/tr/" }
];

const predefinedBlocklist = [
  "https://example.com/ad-page",
  "https://adserver.com/"
];

function isValidURL(str) {
  try {
      new URL(str);
      return true;
  } catch (e) {
      return false;
  }
}

function generateRules(blocklist, trackers, usePredefinedBlocklist, usePredefinedTrackers) {
  let rules = [];
  let ruleId = 1;

  // Domain blocklist rules
  if (usePredefinedBlocklist) {
      blocklist = [...new Set([...blocklist, ...predefinedBlocklist])];
  }
  blocklist.forEach((url) => {
      if (isValidURL(url)) {
          rules.push({
              id: ruleId++,
              priority: 1,
              action: { type: "block" },
              condition: { urlFilter: url, resourceTypes: ["main_frame", "sub_frame"] }
          });
      }
  });

  // Tracker blocklist rules
  if (usePredefinedTrackers) {
      trackers = [...new Set([...trackers, ...predefinedTrackers.map(t => t.domain)])];
  }
  trackers.forEach((tracker) => {
      const predefined = predefinedTrackers.find(t => t.domain === tracker);
      const urlFilter = predefined ? `${tracker}${predefined.path}` : tracker;
      rules.push({
          id: ruleId++,
          priority: 1,
          action: { type: "block" },
          condition: { urlFilter, resourceTypes: ["script", "image", "xmlhttprequest"] }
      });
  });

  return rules;
}

browser.storage.local.get(['blocklist', 'trackerBlocklist', 'usePredefinedBlocklist', 'usePredefinedTrackers']).then((result) => {
  const blocklist = result.blocklist || [];
  const trackerBlocklist = result.trackerBlocklist || [];
  const usePredefinedBlocklist = result.usePredefinedBlocklist !== false; // Default to true
  const usePredefinedTrackers = result.usePredefinedTrackers !== false; // Default to true
  const rules = generateRules(blocklist, trackerBlocklist, usePredefinedBlocklist, usePredefinedTrackers);
  browser.declarativeNetRequest.updateDynamicRules({
      addRules: rules,
      removeRuleIds: []
  }).catch((error) => {
      console.error('Error setting initial rules:', error);
  });
}).catch((error) => {
  console.error('Error loading lists:', error);
});

browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
      browser.storage.local.get(['blocklist', 'trackerBlocklist', 'usePredefinedBlocklist', 'usePredefinedTrackers']).then((result) => {
          const blocklist = result.blocklist || [];
          const trackerBlocklist = result.trackerBlocklist || [];
          const usePredefinedBlocklist = result.usePredefinedBlocklist !== false;
          const usePredefinedTrackers = result.usePredefinedTrackers !== false;
          browser.declarativeNetRequest.getDynamicRules().then((existingRules) => {
              const removeRuleIds = existingRules.map(rule => rule.id);
              const newRules = generateRules(blocklist, trackerBlocklist, usePredefinedBlocklist, usePredefinedTrackers);
              browser.declarativeNetRequest.updateDynamicRules({
                  removeRuleIds: removeRuleIds,
                  addRules: newRules
              }).catch((error) => {
                  console.error('Error updating rules:', error);
              });
          });
      });
  }
});

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.command === "addToBlocklist") {
      if (!isValidURL(message.domain)) {
          console.error('Invalid URL:', message.domain);
          sendResponse({ result: "error", message: "Invalid URL" });
          return true;
      }
      browser.storage.local.get(['blocklist']).then((result) => {
          let blocklist = result.blocklist || [];
          if (!blocklist.includes(message.domain)) {
              blocklist.push(message.domain);
              browser.storage.local.set({ blocklist }).then(() => {
                  console.log('Domain added to blocklist:', message.domain);
                  browser.tabs.query({active: true, currentWindow: true}).then((tabs) => {
                      if (tabs[0]) {
                          browser.tabs.sendMessage(tabs[0].id, { command: "addToBlocklist" });
                      }
                  });
                  sendResponse({ result: "success" });
              }).catch((error) => {
                  console.error('Error saving blocklist:', error);
                  sendResponse({ result: "error", message: error.message });
              });
          } else {
              console.log('Domain already in blocklist:', message.domain);
              sendResponse({ result: "success" });
          }
      }).catch((error) => {
          console.error('Error reading blocklist:', error);
          sendResponse({ result: "error", message: error.message });
      });
      return true;
  } else if (message.command === "BlockElement") {
      browser.storage.local.get(["blockedElements"]).then((result) => {
          let blockedElements = result.blockedElements || [];
          blockedElements.push(message.elementDetails);
          browser.storage.local.set({ blockedElements }).then(() => {
              console.log('Element blocked:', message.elementDetails);
              sendResponse({ result: "success" });
          }).catch((error) => {
              console.error('Error saving blocked elements:', error);
              sendResponse({ result: "error", message: error.message });
          });
      }).catch((error) => {
          console.error('Error reading blocked elements:', error);
          sendResponse({ result: "error", message: error.message });
      });
      return true;
  }
});