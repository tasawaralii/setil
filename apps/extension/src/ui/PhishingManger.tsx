import { useEffect, useState } from "react";

export function PhishingManager() {
  const [whitelist, setWhitelist] = useState<string[]>([]);
  const [sessionAllowed, setSessionAllowed] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState("");

  // -----------------------------
  // Data Loading & Syncing
  // -----------------------------
  const loadPhishingData = () => {
    // 1. Fetch persistent whitelist from local storage
    chrome.storage.local.get(["phishing"], (result) => {
      setWhitelist(result.phishing?.whitelist || []);
    });

    // 2. Fetch ephemeral session exceptions from background memory
    // (Optional: Requires adding a simple response handler in your background if needed,
    // otherwise gracefully falls back to empty list)
    chrome.runtime.sendMessage({ type: "GET_SESSION_PHISHING_DOMAINS" }, (response) => {
      if (response && Array.isArray(response)) {
        setSessionAllowed(response);
      }
    });
  };

  useEffect(() => {
    loadPhishingData();

    // Listen for storage adjustments from background blocks
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === "local" && changes.phishing) {
        setWhitelist(changes.phishing.newValue?.whitelist || []);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  // -----------------------------
  // Interactive Mutators
  // -----------------------------
  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDomain = newDomain.trim().toLowerCase().replace(/^https?:\/\//, "");
    
    if (!cleanDomain || whitelist.includes(cleanDomain)) return;

    const updatedWhitelist = [...whitelist, cleanDomain];
    setWhitelist(updatedWhitelist);
    setNewDomain("");

    const storage = await chrome.storage.local.get(["phishing"]);
    await chrome.storage.local.set({
      phishing: {
        ...storage.phishing,
        whitelist: updatedWhitelist
      }
    });
  };

  const handleRemoveDomain = async (domainToRemove: string) => {
    const updatedWhitelist = whitelist.filter((d) => d !== domainToRemove);
    setWhitelist(updatedWhitelist);

    const storage = await chrome.storage.local.get(["phishing"]);
    await chrome.storage.local.set({
      phishing: {
        ...storage.phishing,
        whitelist: updatedWhitelist
      }
    });
  };

  return (
    <div style={{ marginTop: "12px" }}>
      <h3 style={{ fontSize: "18px", fontWeight: "600", margin: "0 0 6px 0" }}>
        Phishing Rule Exemptions
      </h3>
      <p style={{ color: "#64748b", fontSize: "14px", margin: "0 0 24px 0" }}>
        Configure and manage trusted web locations to customize intercept behavior.
      </p>

      {/* Input Form Box */}
      <form onSubmit={handleAddDomain} style={{ display: "flex", gap: "10px", marginBottom: "28px" }}>
        <input
          type="text"
          placeholder="e.g., internal-network.local"
          value={newDomain}
          onChange={(e) => setNewDomain(e.target.value)}
          style={{
            flex: 1,
            padding: "8px 14px",
            fontSize: "14px",
            border: "1px solid #e2e8f0",
            borderRadius: "6px",
            outline: "none",
            fontFamily: "inherit"
          }}
        />
        <button
          type="submit"
          disabled={!newDomain.trim()}
          style={{
            backgroundColor: "#0f172a",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            padding: "8px 16px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: newDomain.trim() ? "pointer" : "not-allowed",
            opacity: newDomain.trim() ? 1 : 0.6,
            transition: "all 0.1s"
          }}
        >
          Trust Domain
        </button>
      </form>

      {/* Lists Layout Container */}
      {/* add this css for 2nd column 'gridTemplateColumns: "1fr 1fr", gap: "24px"' */}
      <div style={{ display: "grid"}}>
        
        {/* Persistent Whitelist Column */}
        <div>
          <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#334155", marginBottom: "12px" }}>
            Permanently Trusted Whitelist
          </h4>
          <div style={listContainerStyle}>
            {whitelist.length === 0 ? (
              <div style={emptyStateStyle}>No domains whitelisted explicitly.</div>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {whitelist.map((domain) => (
                  <li key={domain} style={listItemStyle}>
                    <span style={{ fontFamily: "monospace", color: "#334155" }}>{domain}</span>
                    <button
                      onClick={() => handleRemoveDomain(domain)}
                      style={deleteButtonStyle}
                      title="Revoke trust framework"
                    >
                      Revoke
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Ephemeral Session Allowed Column */}
        {/* <div>
          <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#334155", marginBottom: "12px" }}>
            Temporary Session Bypasses
          </h4>
          <div style={listContainerStyle}>
            {sessionAllowed.length === 0 ? (
              <div style={emptyStateStyle}>No active bypass rules running in current browser context.</div>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {sessionAllowed.map((domain) => (
                  <li key={domain} style={{ ...listItemStyle, justifyContent: "flex-start" }}>
                    <span style={{ fontFamily: "monospace", color: "#64748b" }}>{domain}</span>
                    <span style={badgeStyle}>Active Session</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div> */}

      </div>
    </div>
  );
}

// -----------------------------
// Component Inline Styles
// -----------------------------
const listContainerStyle = {
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  backgroundColor: "#ffffff",
  maxHeight: "220px",
  overflowY: "auto" as any,
  boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
};

const emptyStateStyle = {
  padding: "32px 16px",
  textAlign: "center" as any,
  fontSize: "13px",
  color: "#94a3b8",
  fontStyle: "italic"
};

const listItemStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px 14px",
  borderBottom: "1px solid #f1f5f9",
  fontSize: "13px"
};

const deleteButtonStyle = {
  background: "transparent",
  border: "none",
  color: "#ef4444",
  fontSize: "12px",
  fontWeight: "500",
  cursor: "pointer",
  padding: "2px 6px"
};

const badgeStyle = {
  marginLeft: "auto",
  backgroundColor: "#f1f5f9",
  color: "#475569",
  fontSize: "11px",
  fontWeight: "500",
  padding: "2px 8px",
  borderRadius: "12px"
};