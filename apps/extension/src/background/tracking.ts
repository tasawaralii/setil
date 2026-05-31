import { incrementStat } from "../stats";
import { getFeatureSettings } from "../settings";
import { isMessageType } from "../messaging";

// ============ TRACKING EVENT LOGGER ============
interface TrackingEvent {
  sourceHostname: string;
  details: string[];
  timestamp: string;
  type: "parameter_stripped" | "script_detected" | "request_blocked";
}

async function logTrackingEvent(event: TrackingEvent) {
  const storage = await chrome.storage.local.get("trackingLog");
  const trackingLog = (storage.trackingLog as TrackingEvent[]) || [];

  // Keep last 500 events to avoid storage bloat
  const newLog = [event, ...trackingLog].slice(0, 500);
  await chrome.storage.local.set({ trackingLog: newLog });
}

async function logBlockedDomain(domain: string) {
  const storage = await chrome.storage.local.get("blockedDomains");
  const blockedDomains =
    (storage.blockedDomains as Record<
      string,
      { count: number; lastBlocked: string }
    >) || {};

  if (!blockedDomains[domain]) {
    blockedDomains[domain] = { count: 0, lastBlocked: "" };
  }

  blockedDomains[domain].count += 1;
  blockedDomains[domain].lastBlocked = new Date().toISOString();

  // Keep top 50 domains
  const sortedDomains = Object.entries(blockedDomains)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 50);

  await chrome.storage.local.set({
    blockedDomains: Object.fromEntries(sortedDomains),
  });
}

// ============ MESSAGE HANDLERS ============
chrome.runtime.onMessage.addListener((message: unknown) => {
  // Handle URL parameter stripping
  if (isMessageType(message, "TRACKING_STRIPPED")) {
    void (async () => {
      const settings = await getFeatureSettings();
      if (!settings.trackingPrevention) return;

      const url = new URL(message.payload.url);
      const currentHostname = url.hostname;

      await logTrackingEvent({
        sourceHostname: currentHostname,
        details: message.payload.removedParams || [],
        timestamp: new Date().toISOString(),
        type: "parameter_stripped",
      });

      await incrementStat("trackersBlocked");
      console.info("Tracking parameters stripped", message.payload.url);
    })();
  }

  // Handle script detection
  if (isMessageType(message, "TRACKING_SCRIPTS_DETECTED")) {
    void (async () => {
      const settings = await getFeatureSettings();
      if (!settings.trackingPrevention) return;

      const pageUrl = message.payload.pageUrl;
      const scripts = message.payload.scripts;
      const hostname = new URL(pageUrl).hostname;

      console.warn("Tracking scripts detected:", scripts);

      await logTrackingEvent({
        sourceHostname: hostname,
        details: scripts,
        timestamp: message.payload.timestamp,
        type: "script_detected",
      });

      // Log each detected script domain separately
      scripts.forEach((script: string) => {
        try {
          const scriptUrl = new URL(script, pageUrl);
          void logBlockedDomain(scriptUrl.hostname);
        } catch (e) {
          // Ignore parsing errors for inline scripts
        }
      });

      await incrementStat("trackersBlocked", scripts.length);
    })();
  }
});

// ============ DNR RULE MATCHED TRACKING ============

// onRuleMatchedDebug is debug-only; in production, DNR blocks happen silently

if (chrome.declarativeNetRequest?.onRuleMatchedDebug) {
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(
    (details: any) => {
      void (async () => {
        const settings = await getFeatureSettings();
        if (!settings.trackingPrevention) return;

        try {
          const url = new URL(details.request.url);
          const domain = url.hostname;

          await logBlockedDomain(domain);
          await incrementStat("trackersBlocked");

          console.info(`[DNR] Blocked request to: ${domain}`);
        } catch (error) {
          console.warn("DNR tracking error:", error);
        }
      })();
    },
  );
}
