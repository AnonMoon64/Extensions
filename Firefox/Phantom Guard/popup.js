document.getElementById('openOptions').addEventListener('click', () => {
    browser.runtime.openOptionsPage().then(() => {
        window.close();
    }).catch((error) => {
        console.error('Error opening options page:', error);
    });
});

document.getElementById('addToBlocklist').addEventListener('click', () => {
    browser.tabs.query({active: true, currentWindow: true}).then((tabs) => {
        if (!tabs[0]) {
            console.error('No active tab found');
            return;
        }
        let url = new URL(tabs[0].url);
        let fullurl = url.toString();
        browser.runtime.sendMessage({command: "addToBlocklist", domain: fullurl}).then((response) => {
            if (response && response.result === "success") {
                console.log('Domain blocked successfully:', fullurl);
                browser.tabs.reload(tabs[0].id).then(() => {
                    window.close();
                });
            } else {
                console.error('Failed to add domain to blocklist:', response);
            }
        }).catch((error) => {
            console.error('Error sending addToBlocklist message:', error);
        });
    }).catch((error) => {
        console.error('Error querying tabs:', error);
    });
});

document.getElementById('blockElement').addEventListener('click', () => {
    browser.tabs.query({active: true, currentWindow: true}).then((tabs) => {
        if (!tabs[0]) {
            console.error('No active tab found');
            return;
        }
        browser.tabs.sendMessage(tabs[0].id, { command: "StartBlocking" }).then((response) => {
            if (response && response.result === "success") {
                console.log('Started blocking mode');
                window.close();
            } else {
                console.error('Failed to start blocking mode:', response);
            }
        }).catch((error) => {
            console.error('Error sending StartBlocking message:', error);
        });
    }).catch((error) => {
        console.error('Error querying tabs:', error);
    });
});