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
  Promise.all([getExtensionStatus(), getFeatureSettings()]).then(([status, settings]) => {
    // Check both global master switch and module-specific toggle
    if (!status.enabled || !settings.permissionManager) return;

    if (isMessageType(message, "LOG_PERMISSION_USE")) {
      const { origin, permission } = message.payload;
      void logWebsitePermissionUse(origin, permission);
    }
  });
  
  // Return false because we don't need to hold the message channel open for async responses
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