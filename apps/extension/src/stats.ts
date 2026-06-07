export const FEATURE_STATS_STORAGE_KEY = "featureStats";

export type StatKey =
  | "phishingSitesBlocked"
  | "filesScanned"
  | "maliciousDownloadsBlocked"
  | "passwordsProtected"
  | "permissionsBlocked"
  | "trackersBlocked"
  | "permissionsAudited";

export type FeatureStat = {
  key: StatKey;
  label: string;
  value: number;
};

export type FeatureStats = Record<StatKey, number>;

export const defaultFeatureStats: FeatureStats = {
  phishingSitesBlocked: 0,
  filesScanned: 0,
  maliciousDownloadsBlocked: 0,
  passwordsProtected: 0,
  permissionsBlocked: 0,
  trackersBlocked: 0,
  permissionsAudited: 0
};

export const normalizeFeatureStats = (
  value: Partial<FeatureStats> | undefined
): FeatureStats => ({
  ...defaultFeatureStats,
  ...(value ?? {})
});

export const getFeatureStats = async (): Promise<FeatureStats> => {
  const stored = await chrome.storage.local.get(FEATURE_STATS_STORAGE_KEY);

  return normalizeFeatureStats(stored[FEATURE_STATS_STORAGE_KEY] as Partial<FeatureStats> | undefined);
};

export const saveFeatureStats = async (stats: FeatureStats): Promise<FeatureStats> => {
  const nextStats = normalizeFeatureStats(stats);

  await chrome.storage.local.set({
    [FEATURE_STATS_STORAGE_KEY]: nextStats
  });

  return nextStats;
};

export const incrementStat = async (
  key: StatKey,
  amount: number = 1
): Promise<FeatureStats> => {
  const currentStats = await getFeatureStats();
  const nextStats = {
    ...currentStats,
    [key]: (currentStats[key] || 0) + amount
  };

  await chrome.storage.local.set({
    [FEATURE_STATS_STORAGE_KEY]: nextStats
  });

  return nextStats;
};

export const ensureDefaultFeatureStats = async (): Promise<FeatureStats> => {
  const stored = await chrome.storage.local.get(FEATURE_STATS_STORAGE_KEY);
  const mergedStats = normalizeFeatureStats(
    stored[FEATURE_STATS_STORAGE_KEY] as Partial<FeatureStats> | undefined
  );

  await chrome.storage.local.set({
    [FEATURE_STATS_STORAGE_KEY]: mergedStats
  });

  return mergedStats;
};
