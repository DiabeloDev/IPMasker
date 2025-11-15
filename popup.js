const checkbox = document.getElementById("enableSwitch");

chrome.storage.sync.get("enabled", (data) => {
  checkbox.checked = data.enabled ?? true;
});

checkbox.addEventListener("change", () => {
  chrome.storage.sync.set({ enabled: checkbox.checked });

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {
      type: "toggle",
      enabled: checkbox.checked
    });
  });
});
