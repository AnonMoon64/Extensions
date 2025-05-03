browser.storage.local.get(["blockedElements"]).then((result) => {
    let blockedElements = result.blockedElements || [];
    const hostname = window.location.hostname;
    blockedElements.forEach((element) => {
        if (element.hostname === hostname) {
            document.querySelectorAll(element.selector).forEach(el => el.remove());
        }
    });
}).catch((error) => {
    console.error('Error loading blocked elements:', error);
});