const style = document.createElement('style');
style.textContent = 'body { visibility: hidden !important; }';
document.documentElement.appendChild(style);

const ipRegex = /\b((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(:[0-9]{1,5})?\b/g;
const MASK_CLASS_NAME = 'ip-masker-badge';
const MASK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 5px; opacity: 0.7; vertical-align: text-bottom;"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"></path></svg>`;

function createMaskBadge(originalIP) {
    const badge = document.createElement('span');
    badge.className = MASK_CLASS_NAME;
    badge.style.cssText = "display: inline-flex; align-items: center; background-color: #e9ecef; border: 1px solid #ced4da; border-radius: 4px; padding: 1px 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #495057; line-height: 1.5; white-space: nowrap;";
    badge.dataset.originalIp = originalIP;
    badge.innerHTML = `${MASK_SVG}Zamaskowane IP`;
    return badge;
}

function maskTextNode(textNode) {
    const parent = textNode.parentNode;
    if (!parent || ['STYLE', 'SCRIPT', 'TEXTAREA', 'HEAD'].includes(parent.tagName) || parent.isContentEditable || parent.classList.contains(MASK_CLASS_NAME)) {
        return false;
    }
    const txt = textNode.nodeValue;
    ipRegex.lastIndex = 0;
    if (!ipRegex.test(txt)) return false;

    const fragment = document.createDocumentFragment();
    let lastIndex = 0, match, hasChanges = false;
    ipRegex.lastIndex = 0;

    while ((match = ipRegex.exec(txt)) !== null) {
        hasChanges = true;
        const textBefore = txt.substring(lastIndex, match.index);
        if (textBefore) fragment.appendChild(document.createTextNode(textBefore));
        
        fragment.appendChild(createMaskBadge(match[0]));
        lastIndex = ipRegex.lastIndex;
    }

    if (!hasChanges) return false;
    const textAfter = txt.substring(lastIndex);
    if (textAfter) fragment.appendChild(document.createTextNode(textAfter));
    parent.replaceChild(fragment, textNode);
    return true;
}

function maskElement(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    const nodesToProcess = [];
    while(walker.nextNode()) nodesToProcess.push(walker.currentNode);
    let changed = 0;
    for (const node of nodesToProcess) {
        if (maskTextNode(node)) changed++;
        if (changed > 500) break;
    }
    return changed;
}

function unmaskAll() {
    const maskedElements = document.querySelectorAll(`.${MASK_CLASS_NAME}`);
    maskedElements.forEach(element => {
        const originalIP = element.dataset.originalIp;
        if (originalIP) {
            element.replaceWith(document.createTextNode(originalIP));
        }
    });
}

const observer = new MutationObserver((mutations) => {
    if (!window.ipMaskerEnabled) return;
    observer.disconnect();
    for (const mutation of mutations) {
        if (mutation.type === "characterData") {
            maskTextNode(mutation.target);
        } else if (mutation.type === "childList") {
            for (const node of mutation.addedNodes) {
                if (node.nodeType === Node.TEXT_NODE) maskTextNode(node);
                else if (node.nodeType === Node.ELEMENT_NODE && !node.classList.contains(MASK_CLASS_NAME)) {
                    maskElement(node);
                }
            }
        }
    }
    startObserving();
});

function startObserving() {
    try {
        observer.observe(document.documentElement || document.body, { childList: true, subtree: true, characterData: true });
    } catch (e) {}
}

chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === "toggle") {
        window.ipMaskerEnabled = !!msg.enabled;
        if (window.ipMaskerEnabled) {
            maskElement(document.body);
        } else {
            unmaskAll();
        }
    }
});

window.addEventListener('DOMContentLoaded', () => {
    chrome.storage.sync.get("enabled", (data) => {
        window.ipMaskerEnabled = data.enabled ?? true;
        if (window.ipMaskerEnabled) {
            maskElement(document.body);
        }
        
        requestAnimationFrame(() => {
            style.remove();
        });

        startObserving();
    });
});