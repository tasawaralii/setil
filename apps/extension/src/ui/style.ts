import { type CSSProperties } from "react";

export const page = {
    minHeight: "100vh",
    margin: 0,
    fontFamily: "system-ui, sans-serif",
    color: "#0f172a"
} satisfies CSSProperties

export const shell = {
    width: "100%",
    maxWidth: 420,
    margin: "0 auto",
    padding: 12,
    boxSizing: "border-box"
} satisfies CSSProperties

export const card = {
    background: "rgba(255, 255, 255, 0.9)",
    border: "1px solid rgba(148, 163, 184, 0.22)",
    borderRadius: 10,
    boxShadow: "0 24px 60px rgba(15, 23, 42, 0.12)",
    padding: 18,
    marginBottom: 14,
    backdropFilter: "blur(16px)"
} satisfies CSSProperties