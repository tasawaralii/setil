import { useEffect, useState, type CSSProperties } from "react";
import {
  defaultFeatureSettings,
  featureDefinitions,
  getFeatureSettings,
  type FeatureKey,
  type FeatureSettings,
  updateFeatureSetting,
  updateVirusTotalApiKey,
  FEATURE_SETTINGS_STORAGE_KEY
} from "../settings";
import { card } from "./style";

const panelStyles = {
  header: {
    display: "grid",
    gap: 8,
    marginBottom: 16
  } satisfies CSSProperties,
  title: {
    margin: 0,
    fontSize: 24,
    lineHeight: 1.1,
    letterSpacing: "-0.03em"
  } satisfies CSSProperties,
  subtitle: {
    margin: 0,
    color: "#475569",
    fontSize: 13,
    lineHeight: 1.5
  } satisfies CSSProperties,
  status: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    padding: "8px 12px",
    borderRadius: 999,
    background: "#f1f5f9",
    color: "#334155",
    fontSize: 12,
    fontWeight: 600
  } satisfies CSSProperties,
  list: {
    display: "grid",
    gap: 8
  } satisfies CSSProperties,
  item: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    padding: 10,
    borderBottom: "1px solid rgba(38, 41, 44, 0.18)",
    background: "#ffffff"
  } satisfies CSSProperties,
  labelGroup: {
    display: "grid",
    gap: 4,
    minWidth: 0
  } satisfies CSSProperties,
  label: {
    margin: 0,
    fontSize: 14,
    fontWeight: 700,
    color: "#0f172a"
  } satisfies CSSProperties,
  description: {
    margin: 0,
    fontSize: 12,
    lineHeight: 1.45,
    color: "#64748b"
  } satisfies CSSProperties,
  switch: {
    position: "relative",
    width: 30,
    height: 15,
    flexShrink: 0
  } satisfies CSSProperties,
  input: {
    position: "absolute",
    inset: 0,
    margin: 0,
    opacity: 0,
    cursor: "pointer"
  } satisfies CSSProperties,
  track: (checked: boolean): CSSProperties => ({
    position: "absolute",
    inset: 0,
    borderRadius: 999,
    background: checked ? "#2563eb" : "#cbd5e1",
    transition: "background-color 160ms ease"
  }),
  thumb: (checked: boolean): CSSProperties => ({
    position: "absolute",
    top: 3,
    left: checked ? 16 : 3,
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "#ffffff",
    boxShadow: "0 6px 14px rgba(15, 23, 42, 0.24)",
    transition: "left 160ms ease"
  })
};

export function FeatureTogglePanel() {
  const [settings, setSettings] = useState<FeatureSettings | null>(null);
  const [isSavingKey, setIsSavingKey] = useState<FeatureKey | null>(null);

  useEffect(() => {
    let active = true;

    const loadSettings = async () => {
      const storedSettings = await getFeatureSettings();

      if (active) {
        setSettings(storedSettings);
      }
    };

    void loadSettings();

    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName !== "local") {
        return;
      }

      const nextValue = changes[FEATURE_SETTINGS_STORAGE_KEY]?.newValue as
        | Partial<FeatureSettings>
        | undefined;

      if (nextValue) {
        setSettings({
          ...defaultFeatureSettings,
          ...nextValue
        });
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      active = false;
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const handleToggle = async (key: FeatureKey, enabled: boolean) => {
    setIsSavingKey(key);

    try {
      const nextSettings = await updateFeatureSetting(key, enabled);
      setSettings(nextSettings);
    } finally {
      setIsSavingKey(null);
    }
  };

  const handleApiKeyChange = async (apiKey: string) => {
    const nextSettings = await updateVirusTotalApiKey(apiKey);
    setSettings(nextSettings);
  };

  return (
    <section style={card}>
      <div style={panelStyles.list}>
        {featureDefinitions.map((feature) => {
          const checked = settings?.[feature.key] ?? false;
          const isSaving = isSavingKey === feature.key;

          return (
            <label key={feature.key} style={panelStyles.item}>
              <div style={panelStyles.labelGroup}>
                <p style={panelStyles.label}>{feature.label}</p>
              </div>

              <span style={panelStyles.switch}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={isSaving}
                  onChange={(event) => {
                    void handleToggle(feature.key, event.target.checked);
                  }}
                  style={panelStyles.input}
                  aria-label={`${feature.label} toggle`}
                />
                <span style={panelStyles.track(checked)} />
                <span style={panelStyles.thumb(checked)} />
              </span>
            </label>
          );
        })}

        <div style={{ ...panelStyles.item, borderBottom: "none", flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
          <div style={panelStyles.labelGroup}>
            <p style={panelStyles.label}>VirusTotal API Key</p>
            <p style={panelStyles.description}>Required for download scanning. Using your own key is recommended.</p>
          </div>
          <input
            type="password"
            value={settings?.virusTotalApiKey || ""}
            onChange={(e) => void handleApiKeyChange(e.target.value)}
            placeholder="Enter your VT API key"
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid #cbd5e1",
              fontSize: 13,
              fontFamily: "monospace"
            }}
          />
        </div>
      </div>
    </section>
  );
  }