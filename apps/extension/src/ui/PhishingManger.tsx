import { useEffect, useState } from "react";
import { getWhitelist, addDomainToWhitelist, removeDomainFromWhitelist } from "../api/phishing";

type WhitelistedDomain = {
  id: number;
  domain: string;
};

export function PhishingManager() {
  const [whitelist, setWhitelist] = useState<WhitelistedDomain[]>([]);
  const [newDomain, setNewDomain] = useState("");

  // -----------------------------
  // Data Loading & Syncing
  // -----------------------------
  const loadPhishingData = async () => {
    try {
      // 1. Fetch persistent whitelist from backend cloud
      const response = await getWhitelist();
      const backendDomains: WhitelistedDomain[] = response;
      setWhitelist(backendDomains);

      // 2. Sync just the strings to local storage for the background worker
      const domainStrings = backendDomains.map((item) => item.domain);
      const storage = await chrome.storage.local.get(["phishing"]);
      await chrome.storage.local.set({
        phishing: { ...storage.phishing, whitelist: domainStrings }
      });
    } catch (error) {
      console.error("Cloud sync failed. Loading local fallback:", error);
      // Fallback if offline
      chrome.storage.local.get(["phishing"], (result) => {
        const localStrings = result.phishing?.whitelist || [];
        setWhitelist(localStrings.map((d: string) => ({ id: -1, domain: d })));
      });
    }
  };

  useEffect(() => {
    loadPhishingData();

    // Listen for storage adjustments from background blocks (e.g., user clicking "Trust" on a red page)
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === "local" && changes.phishing) {
        // We re-fetch from backend to get the newly generated database ID
        loadPhishingData(); 
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
    
    if (!cleanDomain || whitelist.some((w) => w.domain === cleanDomain)) return;

    try {
      // 1. Post to backend
      const response = await addDomainToWhitelist(cleanDomain );
      const addedItem: WhitelistedDomain = response;

      // 2. Update React State
      const updatedWhitelist = [...whitelist, addedItem];
      setWhitelist(updatedWhitelist);
      setNewDomain("");

      // 3. Update Chrome Local Storage
      const domainStrings = updatedWhitelist.map((w) => w.domain);
      const storage = await chrome.storage.local.get(["phishing"]);
      await chrome.storage.local.set({
        phishing: { ...storage.phishing, whitelist: domainStrings }
      });
    } catch (error) {
      console.error("Failed to sync new trusted domain to cloud:", error);
    }
  };

  const handleRemoveDomain = async (idToRemove: number, domainString: string) => {
    try {
      // 1. Delete from backend (if it has a valid database ID)
      if (idToRemove !== -1) {
        await removeDomainFromWhitelist(idToRemove);
      }

      // 2. Update React State
      const updatedWhitelist = whitelist.filter((w) => w.domain !== domainString);
      setWhitelist(updatedWhitelist);

      // 3. Update Chrome Local Storage
      const domainStrings = updatedWhitelist.map((w) => w.domain);
      const storage = await chrome.storage.local.get(["phishing"]);
      await chrome.storage.local.set({
        phishing: { ...storage.phishing, whitelist: domainStrings }
      });
    } catch (error) {
      console.error("Failed to revoke domain from cloud:", error);
    }
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

      <div style={{ display: "grid" }}>
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
                {whitelist.map((item) => (
                  <li key={item.domain} style={listItemStyle}>
                    <span style={{ fontFamily: "monospace", color: "#334155" }}>{item.domain}</span>
                    <button
                      onClick={() => handleRemoveDomain(item.id, item.domain)}
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