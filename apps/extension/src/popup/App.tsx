import { FeatureTogglePanel } from "../ui/FeatureTogglePanel";
import GlobalTogglePanel from "../ui/GlobalTogglePanel";
import { page, shell } from "../ui/style";
import { useEffect, useState } from "react";
import { login, register } from "../api/auth";


interface BlockedDomain {
  count: number;
  lastBlocked: string;
}

const headerStyles = {
  bar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
    padding: "10px 12px",
    borderRadius: 14,
    background: "rgba(255, 255, 255, 0.92)",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
    backdropFilter: "blur(14px)",
    position: "relative", 
    zIndex: 100,
  } as React.CSSProperties,
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  } as React.CSSProperties,
  icon: {
    width: 28,
    height: 28,
    flexShrink: 0,
    display: "block",
  } as React.CSSProperties,
  logo: {
    width: 80,
    height: "auto",
    display: "block",
  } as React.CSSProperties,
  accountButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
    borderRadius: "50%",
    border: "1px solid rgba(37, 99, 235, 0.18)",
    background: "linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)",
    color: "#2563eb",
    cursor: "pointer",
    flexShrink: 0,
  } as React.CSSProperties,
  accountIcon: {
    width: 18,
    height: 18,
    display: "block",
  } as React.CSSProperties,
};

const trackingStatsStyles = {
  container: {
    padding: "12px",
    borderRadius: "8px",
    background: "rgba(59, 130, 246, 0.05)",
    border: "1px solid rgba(59, 130, 246, 0.2)",
    marginBottom: "12px",
  } as React.CSSProperties,
  title: {
    margin: "0 0 8px 0",
    fontSize: "14px",
    fontWeight: "600",
    color: "#1e293b",
  } as React.CSSProperties,
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
    marginBottom: "12px",
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

function TrackingStats() {
  const [stats, setStats] = useState({
    totalBlocked: 0,
    currentSiteCount: 0,
    recentDomains: [] as string[],
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const featureStats = await chrome.storage.local.get("featureStats");
        const blockedDomains = await chrome.storage.local.get("blockedDomains");
        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        const currentUrl = tabs[0]?.url || "";
        const currentHostname = currentUrl
          ? new URL(currentUrl).hostname
          : "unknown";

        const stats = featureStats.featureStats || {};
        const domains =
          (blockedDomains.blockedDomains as Record<string, BlockedDomain>) ||
          {};

        const topDomains = Object.entries(domains)
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 5);

        const recentDomains = topDomains.map(([domain]) => domain);
        const currentSiteCount = domains[currentHostname]?.count || 0;

        setStats({
          totalBlocked: stats.trackersBlocked || 0,
          currentSiteCount,
          recentDomains,
        });
      } catch (error) {
        console.warn("Failed to load tracking stats:", error);
      }
    };

    void loadStats();
  }, []);

  return (
    <div style={trackingStatsStyles.container}>
      <h3 style={trackingStatsStyles.title}>🛡️ Tracking Prevention</h3>

      <div style={trackingStatsStyles.statsGrid}>
        <div style={trackingStatsStyles.statBox}>
          <div style={trackingStatsStyles.statValue}>{stats.totalBlocked}</div>
          <div style={trackingStatsStyles.statLabel}>Total Blocked</div>
        </div>
        <div style={trackingStatsStyles.statBox}>
          <div style={trackingStatsStyles.statValue}>
            {stats.currentSiteCount}
          </div>
          <div style={trackingStatsStyles.statLabel}>This Site</div>
        </div>
      </div>

      {stats.recentDomains.length > 0 && (
        <div style={trackingStatsStyles.domainList}>
          <div style={trackingStatsStyles.domainTitle}>Recently Blocked:</div>
          <ul style={{ margin: "0", paddingLeft: "16px" }}>
            {stats.recentDomains.slice(0, 3).map((domain) => (
              <li key={domain} style={trackingStatsStyles.domainItem}>
                {domain}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [userInitial, setUserInitial] = useState("U");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    chrome.storage.local.get(["token", "userEmail"]).then((data) => {
      if (data.token) {
        setIsAuthenticated(true);
        if (data.userEmail) {
          setUserInitial(data.userEmail.charAt(0).toUpperCase());
        }
      }
    });
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      const fn = isLogin ? login : register;
      const res = await fn(email, password);
      await chrome.storage.local.set({ token: res.access_token, userEmail: email });
      setIsAuthenticated(true);
      setUserInitial(email.charAt(0).toUpperCase());
      setShowAuth(false);
      setEmail("");
      setPassword("");
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || "Authentication failed";
      setAuthError(errorMessage);
    }
  };

  const handleLogout = () => {
    chrome.storage.local.remove(["token", "userEmail"]);
    setIsAuthenticated(false);
    setIsDropdownOpen(false);
  };

  return (
    <main style={page}>
      <div style={shell}>
        <header style={headerStyles.bar}>
          <div style={headerStyles.brand}>
            <img
              src="/icons/icon.png"
              alt="Setil icon"
              style={headerStyles.icon}
            />
            <img src="/icons/logo.png" alt="Setil" style={headerStyles.logo} />
          </div>

          {isAuthenticated ? (
            <div style={{ position: "relative" }}>
              <button
                type="button"
                style={{ ...headerStyles.accountButton, background: "#3b82f6", color: "white" }}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                title="Account"
              >
                <span style={{ fontWeight: "bold", fontSize: "14px" }}>{userInitial}</span>
              </button>
              {isDropdownOpen && (
                <div style={{ position: "absolute", top: "100%", right: "0", marginTop: "8px", background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)", zIndex: 9999, minWidth: "120px", overflow: "hidden" }}>
                  <button type="button" style={{ display: "block", width: "100%", padding: "10px 12px", textAlign: "left", background: "none", border: "none", borderBottom: "1px solid #e2e8f0", fontSize: "13px", color: "#333", cursor: "pointer" }} onClick={() => setIsDropdownOpen(false)}>Settings</button>
                  <button type="button" style={{ display: "block", width: "100%", padding: "10px 12px", textAlign: "left", background: "none", border: "none", fontSize: "13px", color: "#ef4444", cursor: "pointer" }} onClick={handleLogout}>Logout</button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              style={headerStyles.accountButton}
              aria-label="Sign in to your account"
              onClick={() => { setShowAuth(!showAuth); setAuthError(""); }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={headerStyles.accountIcon}
                aria-hidden="true"
              >
                <path
                  d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
                  fill="currentColor"
                />
                <path
                  d="M4 20.5C4 16.91 7.58 14 12 14s8 2.91 8 6.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </header>

        {showAuth && !isAuthenticated && (
          <div style={{ padding: "12px", background: "white", borderRadius: "8px", marginBottom: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#1e293b", textAlign: "center" }}>
              {isLogin ? "Sign In" : "Create Account"}
            </h3>
            <form onSubmit={handleAuth} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {authError && (
                <div style={{ padding: "8px", background: "#fee2e2", color: "#b91c1c", borderRadius: "6px", fontSize: "12px", textAlign: "center", border: "1px solid #fca5a5" }}>
                  {authError}
                </div>
              )}
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
              />
              <button
                type="submit"
                style={{ padding: "8px", background: "#3b82f6", color: "white", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "13px", marginTop: "4px" }}
              >
                {isLogin ? "Login" : "Register"}
              </button>
              <button
                type="button"
                onClick={() => { setIsLogin(!isLogin); setAuthError(""); }}
                style={{ background: "none", border: "none", color: "#64748b", fontSize: "12px", cursor: "pointer", marginTop: "4px" }}
              >
                {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
              </button>
            </form>
          </div>
        )}

        <GlobalTogglePanel />
        <TrackingStats />
        <FeatureTogglePanel />
      </div>
    </main>
  );
}
