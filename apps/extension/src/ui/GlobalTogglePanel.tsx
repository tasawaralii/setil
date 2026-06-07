import React, { useEffect, useState } from 'react';
import { card, shell } from './style';
import { getExtensionStatus, toggleExtensionStatus } from '../settings';

// --- STYLES FOR PROTECTION SUMMARY ---
const protectionStatsStyles = {
  container: {
    padding: "12px",
    borderRadius: "8px",
    background: "rgba(59, 130, 246, 0.05)",
    border: "1px solid rgba(59, 130, 246, 0.2)",
    marginBottom: "12px",
  } as React.CSSProperties,
  title: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    margin: "0 0 10px 0",
    fontSize: "14px",
    fontWeight: "600",
    color: "#1e293b",
  } as React.CSSProperties,
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
    marginBottom: "8px",
  } as React.CSSProperties,
  statBox: {
    padding: "8px",
    borderRadius: "6px",
    background: "white",
    border: "1px solid #e2e8f0",
    textAlign: "center" as const,
  } as React.CSSProperties,
  statValue: {
    fontSize: "18px",
    fontWeight: "bold",
    color: "#3b82f6",
  } as React.CSSProperties,
  statLabel: {
    fontSize: "11px",
    color: "#64748b",
    marginTop: "4px",
  } as React.CSSProperties,
  phishingRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: "6px",
    background: "white",
    border: "1px solid #e2e8f0",
    marginBottom: "12px",
  } as React.CSSProperties,
  phishingLabel: {
    fontSize: "12px",
    color: "#475569",
    fontWeight: "500",
  } as React.CSSProperties,
  phishingValue: {
    fontSize: "16px",
    fontWeight: "bold",
    color: "#ef4444",
  } as React.CSSProperties,
  domainList: {
    fontSize: "12px",
  } as React.CSSProperties,
  domainTitle: {
    fontWeight: "600",
    marginBottom: "6px",
    color: "#1e293b",
  } as React.CSSProperties,
  domainItem: {
    fontSize: "11px",
    color: "#475569",
    marginBottom: "4px",
    paddingLeft: "8px",
  } as React.CSSProperties,
};

// --- PROTECTION SUMMARY SUB-COMPONENT ---
function ProtectionSummary() {
  const [stats, setStats] = useState({
    totalBlocked: 0,
    currentSiteCount: 0,
    phishingBlocked: 0,
    recentDomains: [] as string[],
  });

  useEffect(() => {
    let active = true;

    const loadStats = async () => {
      try {
        const featureStats = await chrome.storage.local.get("featureStats");
        const blockedDomains = await chrome.storage.local.get("blockedDomains");
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentUrl = tabs[0]?.url || "";
        const currentHostname = currentUrl ? new URL(currentUrl).hostname : "unknown";

        const rawStats = featureStats.featureStats || {};
        const domains = (blockedDomains.blockedDomains as Record<string, { count: number, lastBlocked: string }>) || {};

        const topDomains = Object.entries(domains)
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 5);

        const recentDomains = topDomains.map(([domain]) => domain);
        const currentSiteCount = domains[currentHostname]?.count || 0;

        if (active) {
          setStats({
            totalBlocked: rawStats.trackersBlocked || 0,
            currentSiteCount,
            phishingBlocked: rawStats.phishingSitesBlocked || 0,
            recentDomains,
          });
        }
      } catch (error) {
        console.warn("Failed to load tracking stats:", error);
      }
    };

    void loadStats();
    return () => { active = false; };
  }, []);

  return (
    <div style={protectionStatsStyles.container}>
      <h3 style={protectionStatsStyles.title}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        Protection Summary
      </h3>

      <div style={protectionStatsStyles.statsGrid}>
        <div style={protectionStatsStyles.statBox}>
          <div style={protectionStatsStyles.statValue}>{stats.totalBlocked}</div>
          <div style={protectionStatsStyles.statLabel}>Trackers (Total)</div>
        </div>
        <div style={protectionStatsStyles.statBox}>
          <div style={protectionStatsStyles.statValue}>{stats.currentSiteCount}</div>
          <div style={protectionStatsStyles.statLabel}>Trackers (This Site)</div>
        </div>
      </div>

      <div style={protectionStatsStyles.phishingRow}>
        <span style={protectionStatsStyles.phishingLabel}>Phishing sites blocked</span>
        <span style={protectionStatsStyles.phishingValue}>{stats.phishingBlocked}</span>
      </div>

      {stats.recentDomains.length > 0 && (
        <div style={protectionStatsStyles.domainList}>
          <div style={protectionStatsStyles.domainTitle}>Recently Blocked Trackers:</div>
          <ul style={{ margin: "0", paddingLeft: "16px" }}>
            {stats.recentDomains.slice(0, 2).map((domain) => (
              <li key={domain} style={protectionStatsStyles.domainItem}>{domain}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}


// --- MAIN GLOBAL TOGGLE COMPONENT ---
const GlobalTogglePanel = () => {
    const [enabled, setEnabled] = useState(false);
    const [isSavingMaster, setIsSavingMaster] = useState(false);

    useEffect(() => {
        let active = true;

        const loadData = async () => {
            const status = await getExtensionStatus();
            if (active) setEnabled(status.enabled);
        };

        void loadData();
        return () => { active = false; };
    }, []);

    const handleMasterToggle = async () => {
        setIsSavingMaster(true);
        try {
            const nextEnabled = !enabled;
            const nextStatus = await toggleExtensionStatus(nextEnabled);
            setEnabled(nextStatus.enabled);
        } finally {
            setIsSavingMaster(false);
        }
    };

    const openStatsPage = () => {
        chrome.runtime.openOptionsPage();
    };

    const panelStyles = {
        header: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
            paddingBottom: 12,
            borderBottom: "1px solid rgba(148, 163, 184, 0.18)"
        } as React.CSSProperties,
        title: {
            margin: 0,
            fontSize: 20,
            fontWeight: 700,
            color: "#0f172a"
        } as React.CSSProperties,
        switch: {
            position: "relative" as const,
            width: 48,
            height: 28,
            flexShrink: 0
        } as React.CSSProperties,
        input: {
            position: "absolute" as const,
            inset: 0,
            margin: 0,
            opacity: 0,
            cursor: "pointer"
        } as React.CSSProperties,
        track: (checked: boolean) => ({
            position: "absolute" as const,
            inset: 0,
            borderRadius: 999,
            background: checked ? "#2563eb" : "#cbd5e1",
            transition: "background-color 160ms ease"
        } as React.CSSProperties),
        thumb: (checked: boolean) => ({
            cursor: "pointer",
            position: "absolute" as const,
            top: 3,
            left: checked ? 23 : 3,
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "#ffffff",
            boxShadow: "0 6px 14px rgba(15, 23, 42, 0.24)",
            transition: "left 160ms ease"
        } as React.CSSProperties),
        viewAllButton: {
            marginTop: 4, // Reduced margin since it sits right below the summary box now
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid rgba(79, 70, 229, 0.22)",
            background: "rgba(79, 70, 229, 0.08)",
            color: "#4f46e5",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 160ms ease",
            width: "100%"
        } as React.CSSProperties
    };

    return (
        <section style={{ ...card, ...shell, padding: "16px" }}>
            {/* 1. Top Section: Global Toggle */}
            <div style={panelStyles.header}>
                <h2 style={panelStyles.title}>Setil</h2>
                <label style={panelStyles.switch}>
                    <input
                        type="checkbox"
                        checked={enabled}
                        disabled={isSavingMaster}
                        onChange={() => void handleMasterToggle()}
                        style={panelStyles.input}
                        aria-label="Master toggle for all modules"
                    />
                    <span style={panelStyles.track(enabled)} />
                    <span style={panelStyles.thumb(enabled)} />
                </label>
            </div>

            {/* 2. Middle Section: Protection Summary */}
            <ProtectionSummary />

            {/* 3. Bottom Section: View All Stats Button */}
            <button
                onClick={openStatsPage}
                style={panelStyles.viewAllButton}
                onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(79, 70, 229, 0.14)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(79, 70, 229, 0.32)";
                }}
                onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(79, 70, 229, 0.08)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(79, 70, 229, 0.22)";
                }}
            >
                View all stats
            </button>
        </section>
    );
};

export default GlobalTogglePanel;