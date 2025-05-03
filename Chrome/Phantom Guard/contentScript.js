let isBlockingMode = false;
let overlay = null;
let currentTarget = null;
let tooltip = null;
let mutationObserver = null;

function showToast(message) {
    try {
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
        console.log('Toast displayed:', message);
    } catch (error) {
        console.error('Error showing toast:', error);
    }
}

function enableBlockingMode() {
    try {
        if (isBlockingMode) {
            console.warn('Blocking mode already enabled');
            return;
        }
        isBlockingMode = true;

        // Add event listeners for all relevant events
        document.addEventListener('pointerdown', handlePointerDown, { capture: true, passive: false });
        document.addEventListener('touchstart', handleTouchStart, { capture: true, passive: false });
        document.addEventListener('mousedown', handleMouseDown, { capture: true, passive: false });
        document.addEventListener('pointerup', handlePointerUp, { capture: true, passive: false });
        document.addEventListener('touchend', handleTouchEnd, { capture: true, passive: false });
        document.addEventListener('mouseup', handleMouseUp, { capture: true, passive: false });
        document.addEventListener('click', handleClick, { capture: true, passive: false });
        document.addEventListener('contextmenu', handleRightClick, { capture: true, passive: false });
        document.addEventListener('mouseover', highlightElement, { capture: true, passive: true });
        document.addEventListener('mouseout', handleMouseOut, { capture: true, passive: true });

        // Observe DOM mutations to detect ad script interference
        mutationObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
                    mutation.removedNodes.forEach((node) => {
                        if (node.id === 'phantomguard-blocking-style') {
                            console.warn('Blocking style removed by ad script, reapplying');
                            applyBlockingStyle();
                        }
                    });
                }
            });
        });
        mutationObserver.observe(document.head, { childList: true });

        console.log('Blocking mode enabled, event listeners added');
    } catch (error) {
        console.error('Error enabling blocking mode:', error);
    }
}

function applyBlockingStyle() {
    try {
        const existingStyle = document.getElementById('phantomguard-blocking-style');
        if (existingStyle) existingStyle.remove();
        const style = document.createElement('style');
        style.id = 'phantomguard-blocking-style';
        style.textContent = `
            a, button, [onclick], [oncontextmenu], [href] {
                pointer-events: none !important;
            }
        `;
        document.head.appendChild(style);
        console.log('Blocking style applied to disable ad interactions');
    } catch (error) {
        console.error('Error applying blocking style:', error);
    }
}

function disableBlockingMode() {
    try {
        if (!isBlockingMode) {
            console.warn('Blocking mode already disabled');
            return;
        }
        isBlockingMode = false;

        // Remove blocking style
        const style = document.getElementById('phantomguard-blocking-style');
        if (style) style.remove();

        // Remove event listeners
        document.removeEventListener('pointerdown', handlePointerDown, { capture: true });
        document.removeEventListener('touchstart', handleTouchStart, { capture: true });
        document.removeEventListener('mousedown', handleMouseDown, { capture: true });
        document.removeEventListener('pointerup', handlePointerUp, { capture: true });
        document.removeEventListener('touchend', handleTouchEnd, { capture: true });
        document.removeEventListener('mouseup', handleMouseUp, { capture: true });
        document.removeEventListener('click', handleClick, { capture: true });
        document.removeEventListener('contextmenu', handleRightClick, { capture: true });
        document.removeEventListener('mouseover', highlightElement, { capture: true });
        document.removeEventListener('mouseout', handleMouseOut, { capture: true });

        // Disconnect mutation observer
        if (mutationObserver) {
            mutationObserver.disconnect();
            mutationObserver = null;
        }

        removeHighlight();
        console.log('Blocking mode disabled, event listeners and style removed');
    } catch (error) {
        console.error('Error disabling blocking mode:', error);
    }
}

function highlightElement(event) {
    if (!isBlockingMode) return;
    try {
        const element = event.target;
        if (element === document.body || element === document.documentElement || element === overlay || element === tooltip) return;

        if (currentTarget !== element) {
            currentTarget = element;
            removeHighlight();
            overlay = document.createElement('div');
            overlay.id = 'phantomguard-overlay';
            overlay.style.position = 'absolute';
            overlay.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
            overlay.style.zIndex = '10000';
            overlay.style.pointerEvents = 'auto'; // Allow interactions with overlay
            overlay.style.cursor = 'pointer';

            const rect = element.getBoundingClientRect();
            overlay.style.left = `${rect.left + window.scrollX}px`;
            overlay.style.top = `${rect.top + window.scrollY}px`;
            overlay.style.width = `${rect.width}px`;
            overlay.style.height = `${rect.height}px`;

            document.body.appendChild(overlay);

            const selector = getCSSSelector(element);
            tooltip = document.createElement('div');
            tooltip.id = 'phantomguard-tooltip';
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

            // Apply blocking style after overlay is created
            applyBlockingStyle();
            console.log('Highlighted element:', selector);
        }
    } catch (error) {
        console.error('Error highlighting element:', error);
    }
}

function handleMouseOut(event) {
    if (!isBlockingMode) return;
    try {
        const relatedTarget = event.relatedTarget;
        if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
            currentTarget = null;
            removeHighlight();
            console.log('Mouse out, highlight removed');
        }
    } catch (error) {
        console.error('Error handling mouse out:', error);
    }
}

function handlePointerDown(event) {
    if (!isBlockingMode || !currentTarget) return;
    try {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        console.log('Pointer down intercepted:', event.type, event.target.tagName, event.target.className);
    } catch (error) {
        console.error('Error handling pointerdown:', error);
    }
}

function handleTouchStart(event) {
    if (!isBlockingMode || !currentTarget) return;
    try {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        console.log('Touch start intercepted:', event.type, event.target.tagName, event.target.className);
    } catch (error) {
        console.error('Error handling touchstart:', error);
    }
}

function handleMouseDown(event) {
    if (!isBlockingMode || !currentTarget) return;
    try {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        console.log('Mouse down intercepted:', event.type, event.target.tagName, event.target.className);
    } catch (error) {
        console.error('Error handling mousedown:', error);
    }
}

function handlePointerUp(event) {
    if (!isBlockingMode || !currentTarget) return;
    try {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        console.log('Pointer up intercepted:', event.type, event.target.tagName, event.target.className);
    } catch (error) {
        console.error('Error handling pointerup:', error);
    }
}

function handleTouchEnd(event) {
    if (!isBlockingMode || !currentTarget) return;
    try {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        console.log('Touch end intercepted:', event.type, event.target.tagName, event.target.className);
    } catch (error) {
        console.error('Error handling touchend:', error);
    }
}

function handleMouseUp(event) {
    if (!isBlockingMode || !currentTarget) return;
    try {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        console.log('Mouse up intercepted:', event.type, event.target.tagName, event.target.className);
    } catch (error) {
        console.error('Error handling mouseup:', error);
    }
}

function handleClick(event) {
    if (!isBlockingMode || !currentTarget) return;
    try {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        console.log('Click intercepted:', event.type, event.target.tagName, event.target.className);
        blockElement(currentTarget);
    } catch (error) {
        console.error('Error handling click:', error);
    }
}

function handleRightClick(event) {
    if (!isBlockingMode) return;
    try {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        disableBlockingMode();
        showToast('Element blocking cancelled');
        console.log('Right-click cancelled blocking mode');
    } catch (error) {
        console.error('Error handling right-click:', error);
    }
}

function removeHighlight() {
    try {
        if (overlay) {
            overlay.remove();
            overlay = null;
        }
        if (tooltip) {
            tooltip.remove();
            tooltip = null;
        }
        // Remove blocking style when highlight is cleared
        const style = document.getElementById('phantomguard-blocking-style');
        if (style) style.remove();
        console.log('Highlight and blocking style removed');
    } catch (error) {
        console.error('Error removing highlight:', error);
    }
}

function getCSSSelector(element) {
    try {
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
    } catch (error) {
        console.error('Error generating CSS selector:', error);
        return '';
    }
}

function blockElement(element) {
    try {
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
    } catch (error) {
        console.error('Error blocking element:', error);
    }
}

browser.runtime.onMessage.addListener((message) => {
    try {
        console.log('Message received:', message);
        if (message.command === "StartBlocking") {
            console.log('Processing StartBlocking message');
            enableBlockingMode();
            return Promise.resolve({ result: "success" });
        } else if (message.command === "addToBlocklist") {
            showToast('Domain blocked successfully!');
        }
    } catch (error) {
        console.error('Error handling message:', error);
    }
});