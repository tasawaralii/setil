import api from "../api/api";
import { FEATURE_STATS_STORAGE_KEY } from "../stats";

export async function executeGlobalCloudSync() {
  try {
    console.info("Setil Core: Starting cloud profile synchronization...");

    // 1. Fetch & Overwrite Local Password Cache (FIXED: Uses 'credentials' key)
    const passwordRes = await api.get("/passwords/");
    await chrome.storage.local.set({ credentials: passwordRes.data });

    // 2. Fetch & Cache Whitelisted Domains (FIXED: Preserves existing phishing data)
    const domainRes = await api.get("/whitelisted-domains/");
    const domainsArray: string[] = domainRes.data.map((item: { domain: string }) => item.domain);
    
    const existingStorage = await chrome.storage.local.get(["phishing"]);
    await chrome.storage.local.set({ 
      phishing: { 
        ...(existingStorage.phishing || {}), 
        whitelist: domainsArray 
      } 
    });

    // 3. Patch & Synchronize Core Feature Counter Statistics
    const storageData = await chrome.storage.local.get([FEATURE_STATS_STORAGE_KEY]);
    const currentLocalStats = storageData[FEATURE_STATS_STORAGE_KEY] || {};

    const statsRes = await api.patch("/auth/sync-stats", currentLocalStats);
    await chrome.storage.local.set({ [FEATURE_STATS_STORAGE_KEY]: statsRes.data });

    console.info("Setil Core: Synchronization complete. Local engine parameters balanced.");
    return { success: true };
  } catch (error) {
    console.error("Setil Core: Synchronization routine dropped due to intercept:", error);
    return { success: false, error };
  }
}