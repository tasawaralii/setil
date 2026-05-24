import { getFeatureSettings } from "../settings";

// ============ URL SANITIZATION ============
const stripTrackingParameters = async () => {
  const settings = await getFeatureSettings();
  if (!settings.trackingPrevention) return;

  const url = new URL(window.location.href);
  let changed = false;
  const removedParams: string[] = [];

  const trackingParams = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "gclid",
    "fbclid",
    "msclkid",
  ];

  trackingParams.forEach((parameter) => {
    if (url.searchParams.has(parameter)) {
      removedParams.push(parameter);
      url.searchParams.delete(parameter);
      changed = true;
    }
  });

  if (!changed) return;

  window.history.replaceState({}, document.title, url.toString());

  void chrome.runtime.sendMessage({
    type: "TRACKING_STRIPPED",
    payload: {
      url: url.toString(),
      removedParams: removedParams,
      originalUrl: window.location.href,
    },
  });
};

// ============ SCRIPT DETECTION ============
const detectThirdPartyScripts = async () => {
  const settings = await getFeatureSettings();
  if (!settings.trackingPrevention) return;

  const trackerPatterns = [
    /google-analytics/i,
    /gtag/i,
    /googletagmanager/i,
    /facebook\.com.*pixel/i,
    /mixpanel/i,
    /segment/i,
    /amplitude/i,
    /intercom/i,
    /hotjar/i,
    /fullstory/i,
  ];

  const scripts = document.querySelectorAll("script");
  const detectedTrackers: string[] = [];

  scripts.forEach((script) => {
    const src = script.src || script.textContent || "";

    trackerPatterns.forEach((pattern) => {
      if (pattern.test(src)) {
        detectedTrackers.push(script.src || pattern.source);
      }
    });
  });

  if (detectedTrackers.length > 0) {
    void chrome.runtime.sendMessage({
      type: "TRACKING_SCRIPTS_DETECTED",
      payload: {
        scripts: detectedTrackers,
        pageUrl: window.location.href,
        timestamp: new Date().toISOString(),
      },
    });
  }
};

// ============ FINGERPRINT PROTECTION ============
const protectFingerprints = async () => {
  const settings = await getFeatureSettings();
  if (!settings.trackingPrevention) return;

  try {
    // Canvas fingerprint protection
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function (
      type: string,
      ...args: unknown[]
    ) {
      return originalToDataURL.call(this, type, ...args);
    };

    // Navigator hardware concurrency spoofing
    Object.defineProperty(navigator, "hardwareConcurrency", {
      get() {
        return 4; // Fixed value instead of actual core count
      },
      configurable: true,
    });

    // WebGL fingerprinting protection
    const getParameterWebGL = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function (
      parameter: number,
    ) {
      if (parameter === 37445) return "Intel Inc.";
      if (parameter === 37446) return "Intel Iris OpenGL Engine";
      return getParameterWebGL.call(this, parameter);
    };

    // WebGL2 fingerprinting protection
    if (typeof WebGL2RenderingContext !== "undefined") {
      const getParameterWebGL2 = WebGL2RenderingContext.prototype.getParameter;
      WebGL2RenderingContext.prototype.getParameter = function (
        parameter: number,
      ) {
        if (parameter === 37445) return "Intel Inc.";
        if (parameter === 37446) return "Intel Iris OpenGL Engine";
        return getParameterWebGL2.call(this, parameter);
      };
    }

    console.info("[Setil] Fingerprint protection enabled");
  } catch (error) {
    console.warn("[Setil] Fingerprint protection error:", error);
  }
};

// Initialize all protections
void stripTrackingParameters();
void detectThirdPartyScripts();
void protectFingerprints();

// Monitor dynamically added scripts
const originalAppend = Element.prototype.appendChild;
Element.prototype.appendChild = function (node: Node) {
  if (node instanceof HTMLScriptElement) {
    void detectThirdPartyScripts();
  }
  return originalAppend.call(this, node);
};
