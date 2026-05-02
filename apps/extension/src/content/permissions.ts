import { getFeatureSettings } from "../settings";

const globalWindow = window as Window & {
  __setilGeolocationWrapped?: boolean;
};

const wrapGeolocation = () => {
  if (globalWindow.__setilGeolocationWrapped || !navigator.geolocation?.getCurrentPosition) {
    return;
  }

  globalWindow.__setilGeolocationWrapped = true;

  const originalGetCurrentPosition = navigator.geolocation.getCurrentPosition.bind(
    navigator.geolocation
  );

  navigator.geolocation.getCurrentPosition = function (...args) {
    void (async () => {
      const settings = await getFeatureSettings();

      if (!settings.permissionManager) {
        return;
      }

      void chrome.runtime.sendMessage({
        type: "LOG_PERMISSION_USE",
        payload: {
          permission: "geolocation",
          origin: location.origin
        }
      });
    })();

    return originalGetCurrentPosition(...args);
  };
};

wrapGeolocation();