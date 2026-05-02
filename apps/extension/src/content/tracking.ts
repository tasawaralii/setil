import { getFeatureSettings } from "../settings";

const stripTrackingParameters = async () => {
  const settings = await getFeatureSettings();

  if (!settings.trackingPrevention) {
    return;
  }

  const url = new URL(window.location.href);
  let changed = false;

  ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid", "msclkid"].forEach((parameter) => {
    if (url.searchParams.has(parameter)) {
      url.searchParams.delete(parameter);
      changed = true;
    }
  });

  if (!changed) {
    return;
  }

  window.history.replaceState({}, document.title, url.toString());

  void chrome.runtime.sendMessage({
    type: "TRACKING_STRIPPED",
    payload: {
      url: url.toString()
    }
  });
};

void stripTrackingParameters();