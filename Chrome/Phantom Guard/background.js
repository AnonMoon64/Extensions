importScripts('browser-polyfill.min.js');

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

async function generateRules(blocklist, trackers, usePredefinedBlocklist, usePredefinedTrackers) {
    let rules = [];
    // Fetch existing rule IDs to start from a higher number
    const existingRules = await browser.declarativeNetRequest.getDynamicRules().catch(() => []);
    const maxId = existingRules.length > 0 ? Math.max(...existingRules.map(rule => rule.id)) : 0;
    let ruleId = maxId + 1;

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

browser.runtime.onInstalled.addListener(async () => {
    try {
        const result = await browser.storage.local.get(['blocklist', 'trackerBlocklist', 'usePredefinedBlocklist', 'usePredefinedTrackers']);
        const blocklist = result.blocklist || [];
        const trackerBlocklist = result.trackerBlocklist || [];
        const usePredefinedBlocklist = result.usePredefinedBlocklist !== false;
        const usePredefinedTrackers = result.usePredefinedTrackers !== false;
        const rules = await generateRules(blocklist, trackerBlocklist, usePredefinedBlocklist, usePredefinedTrackers);
        const existingRules = await browser.declarativeNetRequest.getDynamicRules();
        const removeRuleIds = existingRules.map(rule => rule.id);
        await browser.declarativeNetRequest.updateDynamicRules({
            addRules: rules,
            removeRuleIds: removeRuleIds
        });
        console.log('Initial rules set successfully');
    } catch (error) {
        console.error('Error setting initial rules:', error);
    }
});

browser.storage.onChanged.addListener(async (changes, area) => {
    if (area === 'local') {
        try {
            const result = await browser.storage.local.get(['blocklist', 'trackerBlocklist', 'usePredefinedBlocklist', 'usePredefinedTrackers']);
            const blocklist = result.blocklist || [];
            const trackerBlocklist = result.trackerBlocklist || [];
            const usePredefinedBlocklist = result.usePredefinedBlocklist !== false;
            const usePredefinedTrackers = result.usePredefinedTrackers !== false;
            const rules = await generateRules(blocklist, trackerBlocklist, usePredefinedBlocklist, usePredefinedTrackers);
            const existingRules = await browser.declarativeNetRequest.getDynamicRules();
            const removeRuleIds = existingRules.map(rule => rule.id);
            await browser.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: removeRuleIds,
                addRules: rules
            });
            console.log('Rules updated successfully');
        } catch (error) {
            console.error('Error updating rules:', error);
        }
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
                            browser.tabs.sendMessage(tabs[0].id, { command: "addToBlocklist" }).catch((error) => {
                                console.error('Error sending addToBlocklist message:', error);
                            });
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