import { ensureDefaultFeatureSettings } from "../settings";
import { ensureDefaultFeatureStats } from "../stats";

const initializeFeatureSettings = async () => {
  await ensureDefaultFeatureSettings();
  await ensureDefaultFeatureStats();
  console.info("Setil background service worker ready.");
};

chrome.runtime.onInstalled.addListener(() => {
  void initializeFeatureSettings();
});

chrome.runtime.onStartup.addListener(() => {
  void ensureDefaultFeatureSettings();
  void ensureDefaultFeatureStats();
});