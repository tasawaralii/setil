import { useEffect, useState } from "react";

type SiteRisk = {
  domain: string;
  score: number;
  flags: string[];
  lastDetected: string;
};

export function PermissionAuditor() {
  const [risks, setRisks] = useState<SiteRisk[]>([]);

  // -----------------------------
  // Data Loading & Syncing
  // -----------------------------
  const loadRiskData = () => {
    chrome.storage.local.get(["permissions"], (result) => {
      const siteRisksObj = result.permissions?.siteRisks || {};
      
      // Convert the object map into an array and sort by highest risk score
      const risksArray = Object.keys(siteRisksObj).map((domain) => ({
        domain,
        ...siteRisksObj[domain]
      })).sort((a, b) => b.score - a.score);

      setRisks(risksArray);
    });
  };

  useEffect(() => {
    loadRiskData();

    // Listen for real-time background script audits
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === "local" && changes.permissions) {
        const siteRisksObj = changes.permissions.newValue?.siteRisks || {};
        const risksArray = Object.keys(siteRisksObj).map((domain) => ({
          domain,
          ...siteRisksObj[domain]
        })).sort((a, b) => b.score - a.score);
        
        setRisks(risksArray);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  const clearAuditLog = async () => {
    await chrome.storage.local.set({ permissions: { siteRisks: {} } });
    setRisks([]);
  };

  // Helper to color-code the risk score
  const getScoreColor = (score: number) => {
    if (score >= 50) return "#ef4444"; // Red
    if (score >= 20) return "#f97316"; // Orange
    return "#10b981"; // Emerald
  };

  return (
    <div style={{ marginTop: "12px" }}>
      {/* Header Area */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <h3 style={{ fontSize: "18px", fontWeight: "600", margin: "0 0 6px 0" }}>
            Site Permissions Audit Log
          </h3>
          <p style={{ color: "#64748b", fontSize: "14px", margin: 0 }}>
            Review websites that have requested sensitive hardware or browser APIs.
          </p>
        </div>
        {risks.length > 0 && (
          <button
            onClick={clearAuditLog}
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              color: "#64748b",
              padding: "6px 12px",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "all 0.1s"
            }}
          >
            Clear Log
          </button>
        )}
      </div>

      {/* Audit Table */}
      {risks.length === 0 ? (
        <div style={{ 
          padding: "40px", 
          textAlign: "center", 
          color: "#94a3b8", 
          border: "1px dashed #e2e8f0", 
          borderRadius: "8px",
          fontSize: "14px"
        }}>
          No suspicious permission requests logged yet.
        </div>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "14px 16px", fontWeight: "600", color: "#64748b" }}>Domain</th>
                <th style={{ padding: "14px 16px", fontWeight: "600", color: "#64748b" }}>Risk Score</th>
                <th style={{ padding: "14px 16px", fontWeight: "600", color: "#64748b" }}>Requested APIs</th>
                <th style={{ padding: "14px 16px", fontWeight: "600", color: "#64748b" }}>Last Detected</th>
              </tr>
            </thead>
            <tbody>
              {risks.map((risk, index) => (
                <tr key={index} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "14px 16px", fontWeight: "500", color: "#0f172a" }}>
                    {risk.domain}
                  </td>
                  
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{ 
                      fontWeight: "700", 
                      color: getScoreColor(risk.score) 
                    }}>
                      {risk.score}
                    </span>
                  </td>
                  
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {risk.flags.map(flag => (
                        <span key={flag} style={{
                          backgroundColor: "#f1f5f9",
                          color: "#475569",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: "500",
                          fontFamily: "monospace"
                        }}>
                          {flag}
                        </span>
                      ))}
                    </div>
                  </td>
                  
                  <td style={{ padding: "14px 16px", color: "#64748b", fontSize: "13px" }}>
                    {new Date(risk.lastDetected).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}