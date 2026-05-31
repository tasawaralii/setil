import { incrementStat } from "../stats";
import { getFeatureSettings } from "../settings";
import { CheckDownloadUrl } from "../api";
import { isMessageType } from "../messaging";

async function notifyContentScript(status: "scanning" | "safe" | "malicious" | "error", filename?: string, reason?: string, downloadId?: number) {
  // Try to notify the active tab in all windows to ensure the user sees it
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: "DOWNLOAD_RESULT",
          payload: { status, filename, reason, downloadId }
        });
      } catch (e) {
        // Ignore errors for tabs that don't have our content script
      }
    }
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (isMessageType(message, "OVERRIDE_DOWNLOAD")) {
    console.log("User overriding download block:", message.payload.downloadId);
    chrome.downloads.resume(message.payload.downloadId);
  }
  
  if (isMessageType(message, "CANCEL_DOWNLOAD")) {
    console.log("User cancelling download:", message.payload.downloadId);
    chrome.downloads.cancel(message.payload.downloadId);
  }
});

chrome.downloads.onCreated.addListener((item) => {
  console.log("Download detected:", item.filename, item.url);
  
  void (async () => {
    const settings = await getFeatureSettings();
    console.log("Download scanner setting:", settings.downloadScanner);

    if (!settings.downloadScanner) {
      console.log("Scanner disabled, skipping.");
      return;
    }

    // Immediately pause the download to scan it
    try {
      await chrome.downloads.pause(item.id);
      console.log("Download paused for scanning:", item.id);
    } catch (e) {
      console.error("Failed to pause download:", e);
    }

    await incrementStat("filesScanned");
    await notifyContentScript("scanning", item.filename);

    try {
      // Perform comprehensive check via backend
      // The backend now handles both URL reputation and hash-based scanning
      console.log("Requesting backend to verify download...");
      const scanResult = await CheckDownloadUrl(item.url, settings.virusTotalApiKey);
      console.log("Scan result:", scanResult);

      if (scanResult.status === "malicious" || scanResult.status === "suspicious") {
        console.warn("THREAT DETECTED. Waiting for user decision.", scanResult.reason);
        // We don't cancel immediately anymore, we let the user decide via the toast
        await incrementStat("maliciousDownloadsBlocked");
        await notifyContentScript("malicious", item.filename, scanResult.reason || "Malicious file detected", item.id);
        return;
      }

      console.log("File deemed safe. Resuming download.");
      await chrome.downloads.resume(item.id);
      await notifyContentScript("safe", item.filename);

    } catch (error) {
      console.error("Download scan error:", error);
      await notifyContentScript("error", item.filename, error instanceof Error ? error.message : "Unknown error during scan");
      await chrome.downloads.resume(item.id);
    }
  })();
});
