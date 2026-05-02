import React, { useEffect, useState } from 'react'
import { card, shell } from './style'
import { getExtensionStatus, toggleExtensionStatus } from '../settings'
import { getFeatureStats, type FeatureStats } from '../stats'

const GlobalTogglePanel = () => {
    const [enabled, setEnabled] = useState(false)
    const [stats, setStats] = useState<FeatureStats | null>(null)
    const [isSavingMaster, setIsSavingMaster] = useState(false)

    useEffect(() => {
        let active = true

        const loadData = async () => {
            const status = await getExtensionStatus()
            const storedStats = await getFeatureStats()

            if (active) {
                setEnabled(status.enabled)
                setStats(storedStats)
            }
        }

        void loadData()

        return () => {
            active = false
        }
    }, [])

    const handleMasterToggle = async () => {
        setIsSavingMaster(true)
        try {
            const nextEnabled = !enabled
            const nextStatus = await toggleExtensionStatus(nextEnabled)
            setEnabled(nextStatus.enabled)
        } finally {
            setIsSavingMaster(false)
        }
    }

    const openStatsPage = () => {
        chrome.runtime.openOptionsPage()
    }

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
        statsSection: {
            display: "grid",
            gap: 12,
            marginTop: 12
        } as React.CSSProperties,
        statItem: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: 10,
            borderRadius: 8,
            background: "#f8fafc",
            border: "1px solid rgba(148, 163, 184, 0.12)"
        } as React.CSSProperties,
        statLabel: {
            margin: 0,
            fontSize: 13,
            color: "#475569",
            fontWeight: 500
        } as React.CSSProperties,
        statValue: {
            margin: 0,
            fontSize: 16,
            fontWeight: 700,
            color: "#0f172a"
        } as React.CSSProperties,
        viewAllButton: {
            marginTop: 12,
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
    }

    return (
        <section style={{ ...card, ...shell }}>
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

            <div style={panelStyles.statsSection}>
                <div style={panelStyles.statItem}>
                    <p style={panelStyles.statLabel}>Phishing sites blocked</p>
                    <p style={panelStyles.statValue}>{stats?.phishingSitesBlocked ?? 0}</p>
                </div>
            </div>

            <button
                onClick={openStatsPage}
                style={panelStyles.viewAllButton}
                onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(79, 70, 229, 0.14)"
                        ; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(79, 70, 229, 0.32)"
                }}
                onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(79, 70, 229, 0.08)"
                        ; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(79, 70, 229, 0.22)"
                }}
            >
                View all stats
            </button>
        </section>
    )
}

export default GlobalTogglePanel
