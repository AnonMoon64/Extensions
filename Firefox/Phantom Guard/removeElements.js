browser.storage.local.get(["blockedElements"]).then((result) => {
    let blockedElements = result.blockedElements || [];
    for (let element of blockedElements) {
        document.querySelectorAll(element.selector).forEach(el => el.remove());
    }
}).catch((error) => {
    console.error('Error loading blocked elements:', error);
});