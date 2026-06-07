import { useState } from "react";
import { executeGlobalCloudSync } from "../utils/SyncManager";

export function CloudSyncButton() {
  const [syncState, setSyncState] = useState<"idle" | "syncing" | "success" | "error">("idle");

  const handleSync = async () => {
    if (syncState === "syncing") return;
    
    setSyncState("syncing");
    
    const result = await executeGlobalCloudSync();
    
    if (result.success) {
      setSyncState("success");
      // Reset back to idle after 2.5 seconds so they can use it again later
      setTimeout(() => setSyncState("idle"), 2500);
    } else {
      setSyncState("error");
      setTimeout(() => setSyncState("idle"), 4000);
    }
  };

  return (
    <button
      onClick={handleSync}
      disabled={syncState === "syncing"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        backgroundColor: syncState === "error" ? "#fee2e2" : "#f1f5f9",
        color: syncState === "error" ? "#ef4444" : "#475569",
        border: `1px solid ${syncState === "error" ? "#f87171" : "#e2e8f0"}`,
        borderRadius: "6px",
        padding: "8px 16px",
        fontSize: "14px",
        fontWeight: "500",
        cursor: syncState === "syncing" ? "wait" : "pointer",
        transition: "all 0.2s ease",
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
      }}
    >
      {/* 1. Syncing Spinner */}
      {syncState === "syncing" && (
        <svg className="animate-spin" style={{ width: "16px", height: "16px", animation: "spin 1s linear infinite" }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }}></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" style={{ opacity: 0.75 }}></path>
        </svg>
      )}

      {/* 2. Success Checkmark */}
      {syncState === "success" && (
        <svg style={{ width: "16px", height: "16px", color: "#10b981" }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path>
        </svg>
      )}

      {/* 3. Default Cloud Icon */}
      {(syncState === "idle" || syncState === "error") && (
        <svg style={{ width: "16px", height: "16px" }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"></path>
        </svg>
      )}

      {syncState === "idle" && "Sync to Cloud"}
      {syncState === "syncing" && "Synchronizing..."}
      {syncState === "success" && "Up to date"}
      {syncState === "error" && "Sync Failed"}

      {/* Add keyframes for the spinner right in the component for portability */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
}