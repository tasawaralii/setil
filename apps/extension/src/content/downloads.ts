import { isMessageType } from "../messaging";

const toastId = "setil-download-toast";

const showToast = (status: "scanning" | "safe" | "malicious" | "error", filename?: string, reason?: string, downloadId?: number) => {
  document.getElementById(toastId)?.remove();

  const toast = document.createElement("div");
  toast.id = toastId;
  
  const content = document.createElement("div");
  
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
      message = `SECURITY WARNING: ${filename || "File"} is flagged as malicious. ${reason || ""}`;
      bgColor = "#dc2626"; // Red
      duration = 0; // Don't auto-hide malicious alerts
      break;
    case "error":
      message = `Scan error for ${filename || "file"}: ${reason || "Check your connection"}`;
      bgColor = "#d97706"; // Amber
      duration = 7000;
      break;
  }

  content.innerText = message;
  toast.appendChild(content);

  if (status === "malicious" && downloadId !== undefined) {
    const actions = document.createElement("div");
    actions.style.cssText = "margin-top: 14px; display: flex; gap: 10px;";

    const keepBtn = document.createElement("button");
    keepBtn.innerText = "Download Anyway";
    keepBtn.style.cssText = "background: #fff; color: #dc2626; border: none; padding: 8px 14px; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 12px; transition: opacity 0.2s;";
    keepBtn.onmouseover = () => keepBtn.style.opacity = "0.9";
    keepBtn.onmouseout = () => keepBtn.style.opacity = "1";
    keepBtn.onclick = () => {
      chrome.runtime.sendMessage({ type: "OVERRIDE_DOWNLOAD", payload: { downloadId } });
      toast.remove();
    };

    const discardBtn = document.createElement("button");
    discardBtn.innerText = "Discard";
    discardBtn.style.cssText = "background: rgba(255,255,255,0.2); color: #fff; border: none; padding: 8px 14px; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 12px; transition: background 0.2s;";
    discardBtn.onmouseover = () => discardBtn.style.background = "rgba(255,255,255,0.3)";
    discardBtn.onmouseout = () => discardBtn.style.background = "rgba(255,255,255,0.2)";
    discardBtn.onclick = () => {
      chrome.runtime.sendMessage({ type: "CANCEL_DOWNLOAD", payload: { downloadId } });
      toast.remove();
    };

    actions.appendChild(keepBtn);
    actions.appendChild(discardBtn);
    toast.appendChild(actions);
  }

  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: ${bgColor};
    color: #fff;
    padding: 18px;
    border-radius: 14px;
    z-index: 2147483647;
    box-shadow: 0 20px 40px rgba(0,0,0,0.4);
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    font-weight: 500;
    max-width: 380px;
    line-height: 1.5;
    border: 1px solid rgba(255,255,255,0.1);
  `;

  document.body.appendChild(toast);
  
  if (duration > 0) {
    window.setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, duration);
  }
};

chrome.runtime.onMessage.addListener((message: unknown) => {
  if (isMessageType(message, "SCANNING_DOWNLOAD")) {
      showToast("scanning", message.payload.filename);
      return;
  }

  if (isMessageType(message, "DOWNLOAD_RESULT")) {
    showToast(message.payload.status, message.payload.filename, message.payload.reason, message.payload.downloadId);
    return;
  }
});
