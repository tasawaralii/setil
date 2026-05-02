import { incrementStat } from "../stats";
import { getFeatureSettings } from "../settings";

chrome.downloads.onCreated.addListener((item) => {
  void (async () => {
    const settings = await getFeatureSettings();

    if (!settings.downloadScanner) {
      return;
    }

    await incrementStat("filesScanned");

    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const targetTab = tabs[0];

    if (!targetTab?.id) {
      return;
    }

    void chrome.tabs.sendMessage(targetTab.id, {
      type: "SCANNING_DOWNLOAD",
      payload: {
        filename: item.filename
      }
    });
  })();
});