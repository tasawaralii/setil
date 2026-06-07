import { getFeatureSettings, getExtensionStatus } from "../settings";
import { incrementStat } from "../stats";
import { isMessageType } from "../messaging";

// Threat Matrix assigning risk weights to access levels
const PERMISSION_RISK_SCORES: Record<string, number> = {
  "geolocation": 5,
  "clipboard": 4,
  "cookies": 9,
  "management": 10,
  "webRequest": 8,
  "<all_urls>": 10
};

// Define the logic that Chrome will inject into the webpage's memory
const hookWebAPIs = () => {
  // Prevent double injection if the tab reloads elements
  if ((window as any).__setilHooked) return;
  (window as any).__setilHooked = true;

  console.log("[Setil Page Context] API Hooks successfully injected via native scripting.");

  // Hook Geolocation
  if (navigator.geolocation) {
    const originalGetPosition = navigator.geolocation.getCurrentPosition;
    navigator.geolocation.getCurrentPosition = function (success, error, options) {
      console.log("[Setil Page Context] 🚩 Geolocation request intercepted!");
      window.dispatchEvent(new CustomEvent('SETIL_API_ALERT', { 
        detail: { permission: 'geolocation', origin: window.location.origin } 
      }));
      return originalGetPosition.apply(this, arguments);
    };
  }

  // Hook Clipboard Read
  if (navigator.clipboard) {
    const originalReadText = navigator.clipboard.readText;
    navigator.clipboard.readText = function () {
      console.log("[Setil Page Context] 🚩 Clipboard read request intercepted!");
      window.dispatchEvent(new CustomEvent('SETIL_API_ALERT', { 
        detail: { permission: 'clipboard', origin: window.location.origin } 
      }));
      return originalReadText.apply(this, arguments);
    };
  }
};

// Listen for tabs loading and natively execute the script
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only inject when the page starts loading to catch scripts early
  if (changeInfo.status === 'loading' && tab.url && tab.url.startsWith('http')) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      world: "MAIN", // <-- This is the magic MV3 key that bypasses the CSP
      func: hookWebAPIs
    }).catch(err => {
      // Safely ignore errors on restricted pages like chrome:// settings
    });
  }
});

const logWebsitePermissionUse = async (origin: string, permission: string) => {
  const storage = await chrome.storage.local.get(["permissions"]);
  let permissionsState = storage.permissions || { siteRisks: {} };
  let siteRisks = permissionsState.siteRisks || {};

  let domain = origin;
  try {
    domain = new URL(origin).hostname;
  } catch (e) {
    // Fallback if origin is malformed or "null"
  }

  const addedRisk = PERMISSION_RISK_SCORES[permission] || 3;

  if (!siteRisks[domain]) {
    siteRisks[domain] = { score: 0, flags: [], lastDetected: "" };
  }

  if (!siteRisks[domain].flags.includes(permission)) {
    siteRisks[domain].flags.push(permission);
    siteRisks[domain].score = Math.min(100, siteRisks[domain].score + (addedRisk * 10));
  }
  
  siteRisks[domain].lastDetected = new Date().toISOString();
  permissionsState.siteRisks = siteRisks;

  await chrome.storage.local.set({ permissions: permissionsState });
  
  // Uses your stats.ts incrementer
  await incrementStat("permissionsAudited"); 
  
  console.log(`[Setil Permission Audit] Updated risk for ${domain}: Score ${siteRisks[domain].score}`);
};

const auditExtensionPermissions = async (extInfo: chrome.management.ExtensionInfo) => {
  if (extInfo.id === chrome.runtime.id) return; // Ignore Setil itself

  let severityPoints = 0;
  const flagsFound: string[] = [];

  extInfo.permissions.forEach((perm) => {
    if (PERMISSION_RISK_SCORES[perm]) {
      severityPoints += PERMISSION_RISK_SCORES[perm];
      flagsFound.push(perm);
    }
  });

  if (severityPoints > 12) {
    chrome.notifications.create(`ext-warn-${extInfo.id}`, {
      type: "basic",
      iconUrl: chrome.runtime.getURL("icons/icon48.png"),
      title: "Risky Extension Audited",
      message: `"${extInfo.name}" holds powerful ecosystem permissions (${flagsFound.join(', ')}).`
    });
  }
};

// -----------------------------
// Message Listener (Webpage Context)
// -----------------------------
chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  if (isMessageType(message, "LOG_PERMISSION_USE")) {
    console.log("[Setil Background Worker] 🟢 Received LOG_PERMISSION_USE payload:", message.payload);
    
    Promise.all([getExtensionStatus(), getFeatureSettings()]).then(([status, settings]) => {
      console.log(`[Setil Background Worker] Master Enabled: ${status.enabled}, Module Enabled: ${settings.permissionManager}`);
      
      if (!status.enabled || !settings.permissionManager) {
        console.log("[Setil Background Worker] Audit aborted because module is toggled off.");
        return;
      }

      const { origin, permission } = message.payload;
      void logWebsitePermissionUse(origin, permission);
    });
  }
  return false; 
});

// -----------------------------
// Ecosystem Event Monitoring (Extension Context)
// -----------------------------
chrome.management.onInstalled.addListener((extInfo) => {
  Promise.all([getExtensionStatus(), getFeatureSettings()]).then(([status, settings]) => {
    if (status.enabled && settings.permissionManager) {
      void auditExtensionPermissions(extInfo);
    }
  });
});