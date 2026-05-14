import { incrementStat } from "../stats";
import { getFeatureSettings } from "../settings";
import { CheckDownloadUrl, CheckDownloadHash } from "../api";

async function calculateHash(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

async function notifyContentScript(status: "scanning" | "safe" | "malicious" | "error", filename?: string, reason?: string) {
  // Try to notify the active tab in all windows to ensure the user sees it
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: "DOWNLOAD_RESULT",
          payload: { status, filename, reason }
        });
      } catch (e) {
        // Ignore errors for tabs that don't have our content script
      }
    }
  }
}

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
      // 1. URL Check
      console.log("Checking URL reputation...");
      const urlResult = await CheckDownloadUrl(item.url, settings.virusTotalApiKey);
      console.log("URL Check result:", urlResult);

      if (urlResult.status === "malicious") {
        console.warn("MALICIOUS URL DETECTED. Cancelling download.");
        await chrome.downloads.cancel(item.id);
        await incrementStat("maliciousDownloadsBlocked");
        await notifyContentScript("malicious", item.filename, urlResult.reason || "Malicious URL detected");
        return;
      }

      // 2. Hash Check
      console.log("Fetching file bytes for hash check...");
      const response = await fetch(item.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch file for hashing: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const hash = await calculateHash(blob);
      console.log("Computed SHA-256 hash:", hash);
      
      const hashResult = await CheckDownloadHash(hash, settings.virusTotalApiKey);
      console.log("Hash Check result:", hashResult);

      if (hashResult.status === "malicious") {
        console.warn("MALICIOUS HASH DETECTED. Cancelling download.");
        await chrome.downloads.cancel(item.id);
        await incrementStat("maliciousDownloadsBlocked");
        await notifyContentScript("malicious", item.filename, hashResult.reason || "Malicious file content detected");
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
