import { isMessageType } from "../messaging";

const overlayId = "setil-phishing-overlay";

const removeExistingOverlay = () => {
  document.getElementById(overlayId)?.remove();
};

const showBlockedPage = (reason: string, domain: string) => {
  removeExistingOverlay();

  const overlay = document.createElement("div");
  overlay.id = overlayId;
  overlay.style.cssText =
    "position:fixed;inset:0;background-color:#0f172a;color:#f8fafc;z-index:2147483647;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;padding:24px;backdrop-filter:blur(10px);";

  overlay.innerHTML = `
    <div style="max-width:500px;background:#1e293b;padding:40px;border-radius:12px;border:1px solid #334155;box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);text-align:center;">
      <div style="width:64px;height:64px;background:#ef4444;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px auto;">
        <svg fill="none" stroke="white" stroke-width="2" viewBox="0 0 24 24" style="width:32px;height:32px;"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
      </div>
      <h1 style="margin:0 0 12px 0;font-size:24px;font-weight:700;">Security Threat Detected</h1>
      <p style="margin:0 0 24px 0;color:#94a3b8;line-height:1.5;">Setil has prevented access to <strong>${domain}</strong>. <br/>Reason: <span style="color:#f8fafc;">${reason}</span></p>
      
      <div style="display:flex;flex-direction:column;gap:12px;">
        <button id="setil-btn-back" style="background:#ef4444;color:white;padding:12px;border:none;border-radius:6px;font-weight:600;font-size:15px;cursor:pointer;transition:background 0.2s;">Return to Safety</button>
        <div style="display:flex;gap:12px;">
          <button id="setil-btn-allow" style="flex:1;background:transparent;color:#94a3b8;border:1px solid #475569;padding:10px;border-radius:6px;font-size:14px;cursor:pointer;transition:all 0.2s;">Allow this time</button>
          <button id="setil-btn-trust" style="flex:1;background:transparent;color:#94a3b8;border:1px solid #475569;padding:10px;border-radius:6px;font-size:14px;cursor:pointer;transition:all 0.2s;">Trust domain</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // 1. Go Back
  document.getElementById("setil-btn-back")?.addEventListener("click", () => {
    history.back();
    removeExistingOverlay();
  });

  // 2. Allow Once (Session)
  document.getElementById("setil-btn-allow")?.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "ALLOW_SESSION_PHISHING", payload: { domain } });
    removeExistingOverlay();
  });

  // 3. Trust Domain (Whitelist)
  document.getElementById("setil-btn-trust")?.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "TRUST_DOMAIN_PHISHING", payload: { domain } });
    removeExistingOverlay();
  });
};

chrome.runtime.onMessage.addListener((message: unknown) => {
  if (isMessageType(message, "BLOCK_PAGE")) {
    showBlockedPage(message.payload.reason, message.payload.domain);
  }
});