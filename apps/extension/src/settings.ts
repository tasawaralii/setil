export const FEATURE_SETTINGS_STORAGE_KEY = "featureSettings";

export type FeatureKey =
  | "phishingDetector"
  | "downloadScanner"
  | "passwordManager"
  | "permissionManager"
  | "trackingPrevention";

export type FeatureSettings = Record<FeatureKey, boolean>;

export type FeatureDefinition = {
  key: FeatureKey;
  label: string;
  description: string;
};

export const featureDefinitions: FeatureDefinition[] = [
  {
    key: "phishingDetector",
    label: "Phishing Detector",
    description: "Warns when a site looks suspicious or impersonates a trusted brand."
  },
  {
    key: "downloadScanner",
    label: "Download Scanner",
    description: "Checks downloaded files for risky patterns before they are opened."
  },
  {
    key: "passwordManager",
    label: "Password Manager",
    description: "Helps store and fill credentials more safely."
  },
  {
    key: "permissionManager",
    label: "Permission Manager",
    description: "Tracks and reviews site permissions before they become noisy."
  },
  {
    key: "trackingPrevention",
    label: "Tracking Prevention",
    description: "Reduces cross-site tracking signals while you browse."
  }
];

export const defaultFeatureSettings: FeatureSettings = {
  phishingDetector: true,
  downloadScanner: true,
  passwordManager: true,
  permissionManager: true,
  trackingPrevention: true
};

export const normalizeFeatureSettings = (
  value: Partial<FeatureSettings> | undefined
): FeatureSettings => ({
  ...defaultFeatureSettings,
  ...(value ?? {})
});

export const getFeatureSettings = async (): Promise<FeatureSettings> => {
  const stored = await chrome.storage.local.get(FEATURE_SETTINGS_STORAGE_KEY);

  return normalizeFeatureSettings(stored[FEATURE_SETTINGS_STORAGE_KEY] as Partial<FeatureSettings> | undefined);
};

export const saveFeatureSettings = async (settings: FeatureSettings): Promise<FeatureSettings> => {
  const nextSettings = normalizeFeatureSettings(settings);

  await chrome.storage.local.set({
    [FEATURE_SETTINGS_STORAGE_KEY]: nextSettings
  });

  return nextSettings;
};

export const updateFeatureSetting = async (
  key: FeatureKey,
  enabled: boolean
): Promise<FeatureSettings> => {
  const currentSettings = await getFeatureSettings();
  const nextSettings = {
    ...currentSettings,
    [key]: enabled
  };

  await chrome.storage.local.set({
    [FEATURE_SETTINGS_STORAGE_KEY]: nextSettings
  });

  return nextSettings;
};

export type ExtensionStatus = {
  enabled: boolean;
};

export const getExtensionStatus = async (): Promise<ExtensionStatus> => {
  const stored = await chrome.storage.local.get({ enabled: true });

  return {
    enabled: Boolean(stored.enabled)
  };
};

export const toggleExtensionStatus = async (enabled: boolean): Promise<ExtensionStatus> => {
  const nextStatus = { enabled };

  await chrome.storage.local.set(nextStatus);

  return nextStatus;
};

export const ensureDefaultFeatureSettings = async (): Promise<FeatureSettings> => {
  const stored = await chrome.storage.local.get(FEATURE_SETTINGS_STORAGE_KEY);
  const mergedSettings = normalizeFeatureSettings(
    stored[FEATURE_SETTINGS_STORAGE_KEY] as Partial<FeatureSettings> | undefined
  );

  await chrome.storage.local.set({
    [FEATURE_SETTINGS_STORAGE_KEY]: mergedSettings
  });

  return mergedSettings;
};