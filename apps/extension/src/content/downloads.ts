import { isMessageType } from "../messaging";

const toastId = "setil-download-toast";

const showToast = (filename?: string) => {
  document.getElementById(toastId)?.remove();

  const toast = document.createElement("div");
  toast.id = toastId;
  toast.innerText = filename
    ? `Setil is scanning ${filename} for malware...`
    : "Setil is scanning your download for malware...";
  toast.style.cssText =
    "position:fixed;bottom:20px;right:20px;background:#111827;color:#fff;padding:10px 14px;border-radius:10px;z-index:2147483647;box-shadow:0 12px 28px rgba(0,0,0,0.2);font-family:system-ui,sans-serif;font-size:13px;";

  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 5000);
};

chrome.runtime.onMessage.addListener((message: unknown) => {
  if (!isMessageType(message, "SCANNING_DOWNLOAD")) {
    return;
  }

  showToast(message.payload.filename);
});