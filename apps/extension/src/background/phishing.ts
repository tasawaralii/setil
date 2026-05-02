import api from "../api/api";
import { incrementStat } from "../stats";
import { getFeatureSettings } from "../settings";

const isInspectableUrl = (url: string) => /^https?:/i.test(url);

const detectPhishing = async (tabId: number, url: string) => {
  const settings = await getFeatureSettings();

  if (!settings.phishingDetector || !isInspectableUrl(url)) {
    return;
  }

  try {
    const response = await api.get("/check-url", {
      params: { url }
    });

    const result = response.data as
      | { status: string; reason: string }
      | undefined;
    const isBlocked = Boolean(
      result?.status != "safe"
    );

    if (!isBlocked) {
      return;
    }

    await incrementStat("phishingSitesBlocked");

    void chrome.tabs.sendMessage(tabId, {
      type: "BLOCK_PAGE",
      payload: {
        reason: result?.reason ?? "This page was flagged as suspicious."
      }
    });
  } catch (error) {
    console.info("Phishing check skipped", error);
  }
};

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || typeof tab.url !== "string") {
    return;
  }

  void detectPhishing(tabId, tab.url);
});