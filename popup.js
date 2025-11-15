const UI = {
    toggleMain: document.getElementById("toggleMain"),
    toggleLocal: document.getElementById("toggleLocal"),
    statCount: document.getElementById("statCount"),
    btnSettings: document.getElementById("btnOpenSettings")
};

function translatePopup(lang) {
    const translation = locales[lang] || locales.en;
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.dataset.i18n;
        if (translation[key]) el.textContent = translation[key];
    });
}

function notifyContentScript(messageType) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, { type: messageType }).catch(() => {});
        }
    });
}

chrome.storage.sync.get(["enabled", "maskLocal", "language"], (data) => {
    UI.toggleMain.checked = data.enabled ?? true;
    UI.toggleLocal.checked = data.maskLocal ?? true;
    UI.toggleLocal.disabled = !UI.toggleMain.checked;
    translatePopup(data.language || "pl");
});

UI.toggleMain.addEventListener("change", () => {
    const isEnabled = UI.toggleMain.checked;
    UI.toggleLocal.disabled = !isEnabled;
    chrome.storage.sync.set({ enabled: isEnabled }, () => notifyContentScript("configUpdated"));
});

UI.toggleLocal.addEventListener("change", () => {
    chrome.storage.sync.set({ maskLocal: UI.toggleLocal.checked }, () => notifyContentScript("configUpdated"));
});

UI.btnSettings.addEventListener("click", () => chrome.runtime.openOptionsPage());
chrome.runtime.onMessage.addListener(msg => {
    if (msg.type === "updateStats") UI.statCount.textContent = msg.count;
});
notifyContentScript("requestStats");