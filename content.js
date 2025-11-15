const CSS_CLASSES = { BADGE: 'ip-masker-badge', REVEALED: 'ip-masker-revealed' };
const ICONS = { SHIELD: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 5px; opacity: 0.7; vertical-align: text-bottom;"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"></path></svg>` };
const BADGE_STYLES = `display: inline-flex; align-items: center; background-color: #e9ecef; border: 1px solid #ced4da; border-radius: 4px; padding: 1px 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #495057; line-height: 1.5; white-space: nowrap; cursor: pointer; user-select: none;`;
const DEFAULTS = {
    localIpPatterns: ["10.*.*.*", "127.*.*.*", "172.16.*.*", "172.17.*.*", "172.18.*.*", "172.19.*.*", "172.20.*.*", "172.21.*.*", "172.22.*.*", "172.23.*.*", "172.24.*.*", "172.25.*.*", "172.26.*.*", "172.27.*.*", "172.28.*.*", "172.29.*.*", "172.30.*.*", "172.31.*.*", "192.168.*.*"]
};

const AppState = {
    config: { enabled: true, maskLocal: true, whitelist: [], localIpPatterns: DEFAULTS.localIpPatterns, language: 'pl' },
    isWhitelisted: false,
    stats: { maskedCount: 0 },
    UI_TEXT: { MASKED: "Zamaskowane IP" }
};

const antiFlickerStyle = document.createElement('style');
chrome.storage.sync.get(["enabled", "whitelist"], (data) => {
    if ((data.enabled ?? true) && !Helpers.isUrlWhitelisted(window.location.href, data.whitelist ?? [])) {
        antiFlickerStyle.textContent = 'body { visibility: hidden !important; }';
        document.documentElement.appendChild(antiFlickerStyle);
    }
});

const Helpers = {
    patternToRegex(pattern) { return new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`); },
    isUrlWhitelisted(url, patterns = []) { return patterns.some(p => { try { return this.patternToRegex(p).test(url); } catch { return false; } }); },
    buildIpRegex(maskLocal, customLocalPatterns) {
        const octet = '(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])';
        const ipv4PublicPattern = `(${octet}\\.){3}${octet}`;
        let ipPattern = ipv4PublicPattern;
        if (maskLocal && customLocalPatterns?.length > 0) {
            const localRegexPart = customLocalPatterns.map(p => p.replace(/\./g, '\\.').replace(/\*/g, octet)).join('|');
            ipPattern = `(${ipv4PublicPattern}|${localRegexPart})`;
        }
        return new RegExp(`\\b${ipPattern}(:[0-9]{1,5})?\\b`, 'g');
    },
    updateBadgeCount() {
        chrome.runtime.sendMessage({ type: "updateStats", count: AppState.stats.maskedCount }, (response) => {
            if (chrome.runtime.lastError) {}
        });
    }
};

const MaskingEngine = {
    createBadge(originalIp) {
        const badge = document.createElement('span');
        badge.className = CSS_CLASSES.BADGE;
        badge.style.cssText = BADGE_STYLES;
        badge.dataset.originalIp = originalIp;
        badge.innerHTML = `${ICONS.SHIELD}<span>${AppState.UI_TEXT.MASKED}</span>`;
        badge.addEventListener('click', (e) => {
            e.stopPropagation();
            const textSpan = badge.querySelector('span');
            if (badge.classList.toggle(CSS_CLASSES.REVEALED)) {
                textSpan.textContent = badge.dataset.originalIp;
                badge.style.backgroundColor = '#fffbe6'; badge.style.borderColor = '#ffe58f';
            } else {
                textSpan.textContent = AppState.UI_TEXT.MASKED;
                badge.style.backgroundColor = '#e9ecef'; badge.style.borderColor = '#ced4da';
            }
        });
        return badge;
    },
    processTextNode(textNode, ipRegex) {
        const parent = textNode.parentNode;
        if (!parent || ['STYLE', 'SCRIPT', 'TEXTAREA', 'HEAD', 'NOSCRIPT'].includes(parent.tagName) || parent.isContentEditable || parent.closest(`.${CSS_CLASSES.BADGE}`)) return false;
        
        const textContent = textNode.nodeValue;
        ipRegex.lastIndex = 0; if (!textContent || !ipRegex.test(textContent)) return false;
        
        const fragment = document.createDocumentFragment();
        let lastIndex = 0, match, hasReplacements = false;
        ipRegex.lastIndex = 0;

        while ((match = ipRegex.exec(textContent)) !== null) {
            hasReplacements = true;
            const textBefore = textContent.substring(lastIndex, match.index);
            if (textBefore) fragment.appendChild(document.createTextNode(textBefore));
            fragment.appendChild(this.createBadge(match[0]));
            AppState.stats.maskedCount++;
            lastIndex = ipRegex.lastIndex;
        }

        if (!hasReplacements) return false;
        
        const textAfter = textContent.substring(lastIndex);
        if (textAfter) fragment.appendChild(document.createTextNode(textAfter));
        parent.replaceChild(fragment, textNode);
        return true;
    },
    processElement(root, ipRegex) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        for (const node of nodes) this.processTextNode(node, ipRegex);
    },
    revertAll() {
        document.querySelectorAll(`.${CSS_CLASSES.BADGE}`).forEach(b => b.replaceWith(document.createTextNode(b.dataset.originalIp)));
        AppState.stats.maskedCount = 0;
    },
    run() {
        this.revertAll();
        AppState.isWhitelisted = Helpers.isUrlWhitelisted(window.location.href, AppState.config.whitelist);
        if (AppState.config.enabled && !AppState.isWhitelisted) {
            const regex = Helpers.buildIpRegex(AppState.config.maskLocal, AppState.config.localIpPatterns);
            this.processElement(document.body, regex);
        }
        Helpers.updateBadgeCount();
    }
};

const DomObserver = new MutationObserver((mutations) => {
    if (!AppState.config.enabled || AppState.isWhitelisted) return;
    const regex = Helpers.buildIpRegex(AppState.config.maskLocal, AppState.config.localIpPatterns);
    let hasChanges = false;
    DomObserver.disconnect();
    for (const mutation of mutations) {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === Node.TEXT_NODE) { 
                    if (MaskingEngine.processTextNode(node, regex)) hasChanges = true;
                } else if (node.nodeType === Node.ELEMENT_NODE) { 
                    MaskingEngine.processElement(node, regex); 
                    hasChanges = true; 
                }
            });
        } else if (mutation.type === 'characterData') { 
            if (MaskingEngine.processTextNode(mutation.target, regex)) hasChanges = true; 
        }
    }
    startWatching();
    if (hasChanges) Helpers.updateBadgeCount();
});

function startWatching() {
    if (AppState.isWhitelisted) return;
    try { DomObserver.observe(document.documentElement, { childList: true, subtree: true, characterData: true }); } catch (e) {}
}

function loadConfigAndRun() {
    chrome.storage.sync.get(["enabled", "maskLocal", "whitelist", "localIpPatterns", "language"], (data) => {
        AppState.config.enabled = data.enabled ?? true;
        AppState.config.maskLocal = data.maskLocal ?? true;
        AppState.config.whitelist = data.whitelist ?? [];
        AppState.config.localIpPatterns = data.localIpPatterns ?? DEFAULTS.localIpPatterns;
        AppState.config.language = data.language || 'pl';
        const lang = AppState.config.language;
        AppState.UI_TEXT.MASKED = locales[lang].maskedIpBadge || locales.en.maskedIpBadge;
        MaskingEngine.run();
        if (antiFlickerStyle.parentNode) requestAnimationFrame(() => antiFlickerStyle.remove());
        startWatching();
    });
}

chrome.runtime.onMessage.addListener(msg => {
    if (msg.type === "configUpdated") loadConfigAndRun();
    else if (msg.type === "requestStats") Helpers.updateBadgeCount();
});

window.addEventListener('DOMContentLoaded', loadConfigAndRun);