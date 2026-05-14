import { isMessageType } from "../messaging";

const toastId = "setil-download-toast";

const showToast = (status: "scanning" | "safe" | "malicious" | "error", filename?: string, reason?: string) => {
  document.getElementById(toastId)?.remove();

  const toast = document.createElement("div");
  toast.id = toastId;
  
  let message = "";
  let bgColor = "#111827"; // Default dark
  let duration = 5000;

  switch (status) {
    case "scanning":
      message = filename ? `Setil is scanning ${filename} for malware...` : "Setil is scanning your download for malware...";
      break;
    case "safe":
      message = `Scan complete: ${filename || "File"} is safe.`;
      bgColor = "#059669"; // Green
      break;
    case "malicious":
      message = `BLOCKED: ${filename || "File"} is malicious. ${reason || ""}`;
      bgColor = "#dc2626"; // Red
      duration = 10000; // Show longer for blocks
      break;
    case "error":
      message = `Scan error for ${filename || "file"}: ${reason || "Check your connection"}`;
      bgColor = "#d97706"; // Amber
      duration = 7000;
      break;
  }

  toast.innerText = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: ${bgColor};
    color: #fff;
    padding: 12px 16px;
    border-radius: 10px;
    z-index: 2147483647;
    box-shadow: 0 12px 28px rgba(0,0,0,0.3);
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    font-weight: 500;
    max-width: 350px;
    line-height: 1.4;
  `;

  document.body.appendChild(toast);
  window.setTimeout(() => {
    if (toast.parentElement) {
      toast.remove();
    }
  }, duration);
};

chrome.runtime.onMessage.addListener((message: unknown) => {
  if (isMessageType(message, "SCANNING_DOWNLOAD")) {
      showToast("scanning", message.payload.filename);
      return;
  }

  if (isMessageType(message, "DOWNLOAD_RESULT")) {
    showToast(message.payload.status, message.payload.filename, message.payload.reason);
    return;
  }
});
