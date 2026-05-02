import { incrementStat } from "../stats";
import { getFeatureSettings } from "../settings";
import { isMessageType } from "../messaging";

chrome.runtime.onMessage.addListener((message: unknown) => {
  if (!isMessageType(message, "TRACKING_STRIPPED")) {
    return;
  }

  void (async () => {
    const settings = await getFeatureSettings();

    if (!settings.trackingPrevention) {
      return;
    }

    await incrementStat("trackersBlocked");
    console.info("Tracking parameters stripped", message.payload.url);
  })();
});