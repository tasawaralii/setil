import { isMessageType } from "../messaging";
import { getFeatureSettings } from "../settings";

chrome.runtime.onMessage.addListener((message: unknown) => {
  if (!isMessageType(message, "LOG_PERMISSION_USE")) {
    return;
  }

  void (async () => {
    const settings = await getFeatureSettings();

    if (!settings.permissionManager) {
      return;
    }

    console.info("Permission usage observed", {
      permission: message.payload.permission,
      origin: message.payload.origin
    });
  })();
});