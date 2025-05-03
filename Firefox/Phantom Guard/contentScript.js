let isBlockingMode = false;
let overlay = null;
let currentTarget = null;
let tooltip = null;

function showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.right = '20px';
    toast.style.backgroundColor = '#007bff';
    toast.style.color = 'white';
    toast.style.padding = '10px 15px';
    toast.style.borderRadius = '5px';
    toast.style.zIndex = '10002';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '1';
    }, 10);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 2000);
}

function enableBlockingMode() {
    isBlockingMode = true;
    document.addEventListener('mouseover', highlightElement, { capture: true });
    document.addEventListener('mouseout', handleMouseOut, { capture: true });
    document.addEventListener('click', handleClick, { capture: true });
    document.addEventListener('contextmenu', handleRightClick, { capture: true });
}

function disableBlockingMode() {
    isBlockingMode = false;
    document.removeEventListener('mouseover', highlightElement, { capture: true });
    document.removeEventListener('mouseout', handleMouseOut, { capture: true });
    document.removeEventListener('click', handleClick, { capture: true });
    document.removeEventListener('contextmenu', handleRightClick, { capture: true });
    removeHighlight();
}

function highlightElement(event) {
    if (!isBlockingMode) return;
    const element = event.target;
    if (element === document.body || element === document.documentElement || element === overlay || element === tooltip) return;

    if (currentTarget !== element) {
        currentTarget = element;
        removeHighlight();
        overlay = document.createElement('div');
        overlay.style.position = 'absolute';
        overlay.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
        overlay.style.zIndex = '10000';
        overlay.style.pointerEvents = 'none';
        overlay.style.cursor = 'pointer';

        const rect = element.getBoundingClientRect();
        overlay.style.left = `${rect.left + window.scrollX}px`;
        overlay.style.top = `${rect.top + window.scrollY}px`;
        overlay.style.width = `${rect.width}px`;
        overlay.style.height = `${rect.height}px`;

        document.body.appendChild(overlay);

        const selector = getCSSSelector(element);
        tooltip = document.createElement('div');
        tooltip.textContent = `Selector: ${selector}`;
        tooltip.style.position = 'fixed';
        tooltip.style.top = '10px';
        tooltip.style.right = '10px';
        tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        tooltip.style.color = 'white';
        tooltip.style.padding = '8px 12px';
        tooltip.style.borderRadius = '5px';
        tooltip.style.zIndex = '10001';
        tooltip.style.fontSize = '14px';
        tooltip.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        tooltip.style.opacity = '0';
        tooltip.style.transition = 'opacity 0.2s ease';
        document.body.appendChild(tooltip);

        setTimeout(() => {
            tooltip.style.opacity = '1';
        }, 10);
    }
}

function handleMouseOut(event) {
    if (!isBlockingMode) return;
    const relatedTarget = event.relatedTarget;
    if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
        currentTarget = null;
        removeHighlight();
    }
}

function handleClick(event) {
    if (!isBlockingMode || !currentTarget) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    blockElement(currentTarget);
}

function handleRightClick(event) {
    if (!isBlockingMode) return;
    event.preventDefault();
    event.stopPropagation();
    disableBlockingMode();
    showToast('Element blocking cancelled');
}

function removeHighlight() {
    if (overlay) {
        overlay.remove();
        overlay = null;
    }
    if (tooltip) {
        tooltip.remove();
        tooltip = null;
    }
}

function getCSSSelector(element) {
    if (element.id) return `#${element.id}`;
    const path = [];
    let current = element;
    while (current && current !== document.body && current !== document.documentElement) {
        let selector = current.tagName.toLowerCase();
        if (current.id) {
            selector = `#${current.id}`;
            path.unshift(selector);
            break;
        }
        if (current.classList.length) {
            selector += `.${Array.from(current.classList).join('.')}`;
        }
        const siblings = Array.from(current.parentElement.children).filter(
            child => child.tagName === current.tagName && child !== current
        );
        if (siblings.length > 0) {
            const index = Array.from(current.parentElement.children).indexOf(current) + 1;
            selector += `:nth-child(${index})`;
        }
        path.unshift(selector);
        current = current.parentElement;
    }
    return path.join(' > ');
}

function blockElement(element) {
    const selector = getCSSSelector(element);
    const hostname = window.location.hostname;
    browser.runtime.sendMessage({
        command: "BlockElement",
        elementDetails: { selector, hostname }
    }).then((response) => {
        if (response.result === "success") {
            element.remove();
            disableBlockingMode();
            showToast('Element blocked successfully!');
            console.log('Element blocked successfully:', selector, 'on', hostname);
        } else {
            console.error('Failed to block element:', response);
        }
    }).catch((error) => {
        console.error('Error sending BlockElement message:', error);
    });
}

browser.runtime.onMessage.addListener((message) => {
    if (message.command === "StartBlocking") {
        enableBlockingMode();
        return Promise.resolve({ result: "success" });
    } else if (message.command === "addToBlocklist") {
        showToast('Domain blocked successfully!');
    }
});