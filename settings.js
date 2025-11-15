const UI = {
    whitelist: document.getElementById("inputWhitelist"),
    localPatterns: document.getElementById("inputLocalPatterns"),
    btnSave: document.getElementById("btnSave"),
    statusMsg: document.getElementById("statusMsg"),
    langButtons: document.querySelectorAll(".lang-switcher button")
};

const DEFAULTS = {
    localPatterns: ["10.*.*.*", "127.*.*.*", "172.16.*.*", "172.17.*.*", "172.18.*.*", "172.19.*.*", "172.20.*.*", "172.21.*.*", "172.22.*.*", "172.23.*.*", "172.24.*.*", "172.25.*.*", "172.26.*.*", "172.27.*.*", "172.28.*.*", "172.29.*.*", "172.30.*.*", "172.31.*.*", "192.168.*.*"],
    language: "pl"
};

let currentLang = DEFAULTS.language;

function translatePage(lang) {
    const translation = locales[lang] || locales.en;
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.dataset.i18n;
        if (translation[key]) {
            el.innerHTML = translation[key];
        }
    });
    UI.langButtons.forEach(btn => {
        btn.classList.toggle("active", btn.dataset.lang === lang);
    });
}

function notifyAllTabs() {
    chrome.tabs.query({}, tabs => tabs.forEach(tab => chrome.tabs.sendMessage(tab.id, { type: "configUpdated" }).catch(() => {})));
}

chrome.storage.sync.get(["whitelist", "localIpPatterns", "language"], (data) => {
    currentLang = data.language || DEFAULTS.language;
    UI.whitelist.value = (data.whitelist || []).join('\n');
    UI.localPatterns.value = (data.localIpPatterns || DEFAULTS.localPatterns).join('\n');
    translatePage(currentLang);
});

UI.btnSave.addEventListener("click", () => {
    const whitelist = UI.whitelist.value.split('\n').map(l => l.trim()).filter(Boolean);
    const localIpPatterns = UI.localPatterns.value.split('\n').map(l => l.trim()).filter(Boolean);
    chrome.storage.sync.set({ whitelist, localIpPatterns, language: currentLang }, () => {
        UI.statusMsg.classList.add("visible");
        notifyAllTabs();
        setTimeout(() => UI.statusMsg.classList.remove("visible"), 2500);
    });
});

UI.langButtons.forEach(button => {
    button.addEventListener("click", (event) => {
        const selectedLang = event.target.dataset.lang;
        if (selectedLang && selectedLang !== currentLang) {
            currentLang = selectedLang;
            translatePage(selectedLang);
            // Zapisujemy język natychmiast po zmianie
            chrome.storage.sync.set({ language: currentLang });
        }
    });
});