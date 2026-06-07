import { useState } from "react";
import { executeGlobalCloudSync } from "../utils/SyncManager";

export function CompactSyncButton() {
  const [syncState, setSyncState] = useState<"idle" | "syncing" | "success" | "error">("idle");

  const handleSync = async () => {
    if (syncState === "syncing") return;
    setSyncState("syncing");
    const result = await executeGlobalCloudSync();
    if (result.success) {
      setSyncState("success");
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
      title={syncState === "idle" ? "Sync to Cloud" : "Syncing..."}
      style={{
        background: "transparent",
        border: "none",
        cursor: syncState === "syncing" ? "wait" : "pointer",
        color: syncState === "error" ? "#ef4444" : (syncState === "success" ? "#10b981" : "#64748b"),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "4px",
        transition: "color 0.2s"
      }}
    >
      {syncState === "syncing" && (
        <svg style={{ width: "20px", height: "20px", animation: "spin 1s linear infinite" }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }}></circle>
          <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" style={{ opacity: 0.75 }}></path>
        </svg>
      )}
      {syncState === "success" && (
        <svg style={{ width: "20px", height: "20px" }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path>
        </svg>
      )}
      {(syncState === "idle" || syncState === "error") && (
        <svg style={{ width: "20px", height: "20px" }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"></path>
        </svg>
      )}
    </button>
  );
}