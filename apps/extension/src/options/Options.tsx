import { useEffect, useState } from "react";
import { FeatureTogglePanel } from "../ui/FeatureTogglePanel";
import { getFeatureStats, FeatureStats, defaultFeatureStats, FEATURE_STATS_STORAGE_KEY } from "../stats";

export function Options() {
  const [stats, setStats] = useState<FeatureStats>(defaultFeatureStats);

  useEffect(() => {
    getFeatureStats().then((data) => {
      setStats(data);
    });

    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === "local" && changes[FEATURE_STATS_STORAGE_KEY]) {
        setStats(changes[FEATURE_STATS_STORAGE_KEY].newValue as FeatureStats);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  // Updated configuration using subtle status dots instead of heavy borders
  const statCards = [
    { key: "phishingSitesBlocked", label: "Phishing Sites Blocked", value: stats.phishingSitesBlocked, dotColor: "#ef4444" }, // Red
    { key: "passwordsProtected", label: "Passwords Protected", value: stats.passwordsProtected, dotColor: "#3b82f6" },     // Blue
    { key: "permissionsAudited", label: "Permissions Audited", value: stats.permissionsAudited, dotColor: "#10b981" },     // Emerald
    { key: "trackersBlocked", label: "Trackers Blocked", value: stats.trackersBlocked, dotColor: "#f97316" },            // Orange
    { key: "filesScanned", label: "Files Scanned", value: stats.filesScanned, dotColor: "#6366f1" },                   // Indigo
    { key: "maliciousDownloadsBlocked", label: "Downloads Blocked", value: stats.maliciousDownloadsBlocked, dotColor: "#f43f5e" }, // Rose
  ];

  return (
    <div style={{ 
      minHeight: "100vh", 
      backgroundColor: "#fafafa", 
      padding: "48px 24px", 
      fontFamily: "Inter, system-ui, sans-serif",
      color: "#0f172a"
    }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        
        {/* Header */}
        <header style={{ marginBottom: "40px" }}>
          <h1 style={{ 
            fontSize: "28px", 
            fontWeight: "700", 
            letterSpacing: "-0.02em",
            margin: "0 0 8px 0" 
          }}>
            Setil Security Dashboard
          </h1>
          <p style={{ color: "#64748b", margin: 0, fontSize: "15px" }}>
            Monitor your protection metrics and manage your module configurations.
          </p>
        </header>

        {/* Stats Grid */}
        <section style={{ marginBottom: "48px" }}>
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", 
            gap: "16px" 
          }}>
            {statCards.map((stat) => (
              <div 
                key={stat.key} 
                style={{ 
                  backgroundColor: "#ffffff", 
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px", 
                  padding: "24px",
                  boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between"
                }}
              >
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "10px", 
                  marginBottom: "16px" 
                }}>
                  <div style={{ 
                    width: "8px", 
                    height: "8px", 
                    borderRadius: "50%", 
                    backgroundColor: stat.dotColor,
                    boxShadow: `0 0 8px ${stat.dotColor}40` // Subtle glow matching the dot
                  }} />
                  <span style={{ 
                    fontSize: "14px", 
                    fontWeight: "500", 
                    color: "#64748b" 
                  }}>
                    {stat.label}
                  </span>
                </div>
                <div style={{ 
                  fontSize: "36px", 
                  fontWeight: "700", 
                  lineHeight: "1",
                  letterSpacing: "-0.02em"
                }}>
                  {stat.value.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Feature Toggles */}
        <section style={{ 
          backgroundColor: "#ffffff", 
          border: "1px solid #e2e8f0",
          borderRadius: "8px", 
          padding: "32px",
          boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
        }}>
          <h2 style={{ 
            fontSize: "18px", 
            fontWeight: "600", 
            marginBottom: "24px",
            letterSpacing: "-0.01em"
          }}>
            Active Security Modules
          </h2>
          <FeatureTogglePanel />
        </section>

      </div>
    </div>
  );
}