import { incrementStat } from "../stats";
import { getFeatureSettings } from "../settings";
import { isMessageType } from "../messaging";

chrome.runtime.onMessage.addListener((message: unknown) => {
  if (!isMessageType(message, "SAVE_CREDS")) {
    return;
  }

  void (async () => {
    const settings = await getFeatureSettings();

    if (!settings.passwordManager) {
      return;
    }

    await incrementStat("passwordsProtected");

    console.info("Captured credential event", {
      origin: message.payload.origin,
      username: message.payload.username
    });
  })();
});