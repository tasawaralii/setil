import { FeatureTogglePanel } from "../ui/FeatureTogglePanel";
import GlobalTogglePanel from "../ui/GlobalTogglePanel";
import { page, shell } from "../ui/style";

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
    backdropFilter: "blur(14px)"
  } as React.CSSProperties,
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 0
  } as React.CSSProperties,
  icon: {
    width: 28,
    height: 28,
    flexShrink: 0,
    display: "block"
  } as React.CSSProperties,
  logo: {
    width: 80,
    height: "auto",
    display: "block"
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
    flexShrink: 0
  } as React.CSSProperties,
  accountIcon: {
    width: 18,
    height: 18,
    display: "block"
  } as React.CSSProperties
};

export function App() {
  return (
    <main style={page}>
      <div style={shell}>
        <header style={headerStyles.bar}>
          <div style={headerStyles.brand}>
            <img src="/icons/icon.png" alt="Setil icon" style={headerStyles.icon} />
            <img src="/icons/logo.png" alt="Setil" style={headerStyles.logo} />
          </div>

          <button
            type="button"
            style={headerStyles.accountButton}
            aria-label="Sign in to your account"
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
        </header>

        <GlobalTogglePanel />
        <FeatureTogglePanel />
      </div>
    </main>
  );
}