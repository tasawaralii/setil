import api from "../api/api";
import { incrementStat } from "../stats";
import { getFeatureSettings } from "../settings";
import { addDomainToWhitelist } from "../api/phishing"

const isInspectableUrl = (url: string) => /^https?:/i.test(url);

// In-memory cache for session-based bypasses (resets when browser closes)
const sessionAllowedDomains = new Set<string>();

const sendMessageWithRetry = async (tabId: number, message: any, retries = 10) => {
  for (let i = 0; i < retries; i++) {
    try {
      await chrome.tabs.sendMessage(tabId, message);
      return; // Success! The content script heard us.
    } catch (error) {
      // Content script isn't injected yet. Wait 200ms and try again.
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  console.error("Setil: Failed to inject phishing overlay after retries.");
};

const detectPhishing = async (tabId: number, url: string) => {
  const settings = await getFeatureSettings();
  if (!settings.phishingDetector || !isInspectableUrl(url)) return;

  const urlObj = new URL(url);
  const domain = urlObj.hostname;

  // 1. Check if user bypassed this in the current session
  if (sessionAllowedDomains.has(domain)) {
    return;
  }

  // 2. Check persistent whitelist in storage
  const storage = await chrome.storage.local.get(["phishing"]);
  const whitelist: string[] = storage.phishing?.whitelist || [];
  if (whitelist.includes(domain)) {
    return;
  }

  try {
    const response = await api.get("/check-url", {
      params: {
        url,
        api_key: settings.virusTotalApiKey // Pass user's key if available
      }
    });

    const result = response.data as { status: string; reason: string } | undefined;
    const isBlocked = result?.status === "malicious" || result?.status === "warning";

    if (!isBlocked) return;

    await incrementStat("phishingSitesBlocked");

    // Send block message with the domain included for the whitelist feature
    await sendMessageWithRetry(tabId, {
      type: "BLOCK_PAGE",
      payload: {
        reason: result?.reason ?? "This page was flagged as suspicious.",
        domain: domain
      }
    });
  } catch (error) {
    console.info("Phishing check skipped", error);
  }
};

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Trigger on URL change (faster than waiting for 'complete')
  if (changeInfo.url) {
    void detectPhishing(tabId, changeInfo.url);
  }
});

// Listen for user bypass decisions from the content script
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "ALLOW_SESSION_PHISHING") {
    // sessionAllowedDomains.add(message.payload.domain);
  }
  else if (message.type === "TRUST_DOMAIN_PHISHING") {
    const targetDomain = message.payload.domain;

    // We pull "token" as well to ensure we only hit the backend if the user is logged in
    chrome.storage.local.get(["token", "phishing"]).then(async (storage) => {
      const whitelist = storage.phishing?.whitelist || [];

      if (!whitelist.includes(targetDomain)) {
        // 2. Instant Local Update (Optimistic update so the UX feels instant)
        const updatedWhitelist = [...whitelist, targetDomain];
        await chrome.storage.local.set({
          phishing: { ...storage.phishing, whitelist: updatedWhitelist }
        });

        // 3. Backend Synchronization
        if (storage.token) {
          try {
            await addDomainToWhitelist(targetDomain);
            console.info(`Setil: Successfully synced ${targetDomain} to cloud whitelist.`);
          } catch (error) {
            console.error("Setil: Failed to sync trusted domain to backend:", error);
          }
        } else {
          console.info("Setil: User not logged in. Domain trusted locally only.");
        }
      }
    })
  }
});