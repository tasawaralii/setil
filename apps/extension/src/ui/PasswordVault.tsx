import { useEffect, useState } from "react";

import {deletePassword} from "../api/passwords";

// Mirroring the background credential schema
type Credential = {
  id: number | null;
  username: string | null;
  password: string; // JSON string of encrypted data array
  iv: number[];
  origin: string;
  created_at?: string;
  updated_at?: string;
};

const SECRET_KEY = "super-secret-key-change-this";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function PasswordVault() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [revealedPasswords, setRevealedPasswords] = useState<Record<number, string>>({});
  const [visibleState, setVisibleState] = useState<Record<number, boolean>>({});

  // -----------------------------
  // On-Demand Decryption Engine
  // -----------------------------
  const decryptPassword = async (encryptedJson: string, ivArray: number[]): Promise<string> => {
    try {
      const keyMaterial = await crypto.subtle.digest("SHA-256", encoder.encode(SECRET_KEY));
      const key = await crypto.subtle.importKey(
        "raw",
        keyMaterial,
        { name: "AES-GCM" },
        false,
        ["decrypt"]
      );

      const data = new Uint8Array(JSON.parse(encryptedJson));
      const iv = new Uint8Array(ivArray);

      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        data
      );
      return decoder.decode(decrypted);
    } catch (error) {
      console.error("Decryption failed:", error);
      return "Error decrypting";
    }
  };

  // -----------------------------
  // Core Lifecycle & Storage Sync
  // -----------------------------
  const loadCredentials = () => {
    chrome.storage.local.get(["credentials"], (result) => {
      setCredentials(result.credentials || []);
    });
  };

  useEffect(() => {
    loadCredentials();

    // Sync with storage shifts in real-time
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area === "local" && changes.credentials) {
        setCredentials(changes.credentials.newValue || []);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  // -----------------------------
  // UI Interaction Handlers
  // -----------------------------
  const toggleVisibility = async (index: number, credential: Credential) => {
    if (visibleState[index]) {
      setVisibleState((prev) => ({ ...prev, [index]: false }));
    } else {
      // Decrypt on-demand only when requested to maintain security bounds
      if (!revealedPasswords[index]) {
        const plainText = await decryptPassword(credential.password, credential.iv);
        setRevealedPasswords((prev) => ({ ...prev, [index]: plainText }));
      }
      setVisibleState((prev) => ({ ...prev, [index]: true }));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Simple transient feedback pattern could be attached here
  };

  const deleteCredential = async (indexToRemove: number) => {
    const credentialToDelete = credentials[indexToRemove];
    if (!credentialToDelete) return;

    // 1. If the credential has a valid backend ID, delete it from Neon Postgres
    if (credentialToDelete.id !== null) {
      try {
        console.log(`Attempting cloud removal for credential ID: ${credentialToDelete.id}`);
        await deletePassword(credentialToDelete.id);
      } catch (error) {
        console.error("Backend database deletion dropped. Processing local fallback cleanup:", error);
        // We continue to remove it locally so the UX doesn't freeze for the user
      }
    } else {
      console.log(credentialToDelete);
      console.log("Local-only credential detected. Skipping backend sync pipeline.");
    }

    const updated = credentials.filter((_, idx) => idx !== indexToRemove);
    
    await chrome.storage.local.set({ credentials: updated });

    setVisibleState({});
    setRevealedPasswords({});
  };

  const filteredCredentials = credentials.filter((c) => {
    const search = searchQuery.toLowerCase();
    return (
      c.origin.toLowerCase().includes(search) ||
      (c.username && c.username.toLowerCase().includes(search))
    );
  });

  return (
    <div style={{ marginTop: "32px" }}>
      {/* Search Header */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: "20px" 
      }}>
        <h3 style={{ fontSize: "18px", fontWeight: "600", margin: 0 }}>Stored Credentials Vault</h3>
        <input
          type="text"
          placeholder="Search domain or username..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: "8px 14px",
            fontSize: "14px",
            border: "1px solid #e2e8f0",
            borderRadius: "6px",
            outline: "none",
            width: "260px",
            fontFamily: "inherit"
          }}
        />
      </div>

      {/* Credentials Table / Empty State */}
      {filteredCredentials.length === 0 ? (
        <div style={{ 
          padding: "40px", 
          textAlign: "center", 
          color: "#94a3b8", 
          border: "1px dashed #e2e8f0", 
          borderRadius: "8px" 
        }}>
          No accounts found matching search constraints.
        </div>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "14px 16px", fontWeight: "600", color: "#64748b" }}>Origin Site</th>
                <th style={{ padding: "14px 16px", fontWeight: "600", color: "#64748b" }}>Username</th>
                <th style={{ padding: "14px 16px", fontWeight: "600", color: "#64748b" }}>Password Cipher</th>
                <th style={{ padding: "14px 16px", fontWeight: "600", color: "#64748b", textAlignment: "right" } as any}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCredentials.map((cred, index) => (
                <tr key={index} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  {/* Origin */}
                  <td style={{ padding: "14px 16px", fontWeight: "500", color: "#0f172a" }}>
                    {cred.origin.replace(/^https?:\/\//, "")}
                  </td>
                  
                  {/* Username */}
                  <td style={{ padding: "14px 16px", color: "#334155" }}>
                    {cred.username || <span style={{ color: "#cbd5e1", fontStyle: "italic" }}>None Provided</span>}
                  </td>
                  
                  {/* Password Display */}
                  <td style={{ padding: "14px 16px", fontFamily: "monospace", letterSpacing: "0.05em" }}>
                    {visibleState[index] ? (
                      <span style={{ color: "#0f172a" }}>{revealedPasswords[index]}</span>
                    ) : (
                      <span style={{ color: "#94a3b8" }}>••••••••••••</span>
                    )}
                  </td>
                  
                  {/* Contextual Utility Actions */}
                  <td style={{ padding: "14px 16px", textAlign: "right" } as any}>
                    <div style={{ display: "inline-flex", gap: "8px" }}>
                      <button
                        onClick={() => toggleVisibility(index, cred)}
                        style={actionButtonStyle}
                        title="Toggle plain visibility"
                      >
                        {visibleState[index] ? "Hide" : "Reveal"}
                      </button>
                      <button
                        onClick={() => cred.username && copyToClipboard(cred.username)}
                        disabled={!cred.username}
                        style={actionButtonStyle}
                        title="Copy username"
                      >
                        Copy User
                      </button>
                      <button
                        onClick={async () => {
                          const pass = visibleState[index] ? revealedPasswords[index] : await decryptPassword(cred.password, cred.iv);
                          copyToClipboard(pass);
                        }}
                        style={actionButtonStyle}
                        title="Copy decrypted password"
                      >
                        Copy Pass
                      </button>
                      <button
                        onClick={() => deleteCredential(index)}
                        style={{ ...actionButtonStyle, color: "#ef4444" }}
                        title="Remove locally cached block"
                      >
                        Delete
                      </button>
                    </div>
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

const actionButtonStyle = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "4px",
  padding: "4px 10px",
  fontSize: "12px",
  fontWeight: "500",
  color: "#475569",
  cursor: "pointer",
  outline: "none",
  transition: "all 0.1s ease"
};