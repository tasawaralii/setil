import { isMessageType } from "../messaging";

const overlayId = "setil-phishing-overlay";

const removeExistingOverlay = () => {
  document.getElementById(overlayId)?.remove();
};

const showBlockedPage = (reason: string) => {
  removeExistingOverlay();

  const overlay = document.createElement("div");
  overlay.id = overlayId;
  overlay.style.cssText =
    "position:fixed;inset:0;background:#b91c1c;color:white;z-index:2147483647;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;padding:24px;";

  overlay.innerHTML = `
    <div style="max-width:420px;text-align:center;display:grid;gap:16px;">
      <h1 style="margin:0;font-size:28px;line-height:1.1;">Blocked: ${reason}</h1>
      <button id="setil-exit-block" style="padding:12px 16px;border:0;border-radius:999px;font-weight:700;cursor:pointer;">Go Back</button>
    </div>
  `;

  document.body.appendChild(overlay);
  document.getElementById("setil-exit-block")?.addEventListener("click", () => {
    history.back();
  });
};

chrome.runtime.onMessage.addListener((message: unknown) => {
  if (!isMessageType(message, "BLOCK_PAGE")) {
    return;
  }

  showBlockedPage(message.payload.reason);
});