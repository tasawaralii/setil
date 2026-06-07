import { getFeatureSettings } from "../settings";

const TRACKING_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "msclkid",
];

const TRACKER_PATTERNS = [
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

// ============ URL SANITIZATION ============
const stripTrackingParameters = async () => {
  const settings = await getFeatureSettings();
  if (!settings.trackingPrevention) return;

  const url = new URL(window.location.href);
  let changed = false;
  const removedParams: string[] = [];

  TRACKING_PARAMS.forEach((parameter) => {
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
      removedParams,
      originalUrl: window.location.href,
    },
  });
};

// ============ SCRIPT DETECTION ============
const reportTrackerScript = (src: string) => {
  void chrome.runtime.sendMessage({
    type: "TRACKING_SCRIPTS_DETECTED",
    payload: {
      scripts: [src],
      pageUrl: window.location.href,
      timestamp: new Date().toISOString(),
    },
  });
};

const checkScript = (script: HTMLScriptElement) => {
  const src = script.src || script.textContent || "";
  for (const pattern of TRACKER_PATTERNS) {
    if (pattern.test(src)) {
      reportTrackerScript(script.src || pattern.source);
      break;
    }
  }
};

const detectThirdPartyScripts = async () => {
  const settings = await getFeatureSettings();
  if (!settings.trackingPrevention) return;

  document.querySelectorAll<HTMLScriptElement>("script").forEach(checkScript);
};

// ============ REFERRER STRIPPING ============
const stripReferrer = async () => {
  const settings = await getFeatureSettings();
  if (!settings.trackingPrevention) return;

  try {
    // Override the referrer policy to "no-referrer" for outgoing requests
    const meta = document.createElement("meta");
    meta.name = "referrer";
    meta.content = "no-referrer";
    document.head.insertBefore(meta, document.head.firstChild);

    console.info("[Setil] Referrer stripping enabled");
  } catch (error) {
    console.warn("[Setil] Referrer stripping error:", error);
  }
};

// ============ STORAGE CLEANUP ============
const cleanTrackerStorage = async () => {
  const settings = await getFeatureSettings();
  if (!settings.trackingPrevention) return;

  try {
    // Known tracker storage keys to clean up
    const trackerKeys = [
      // Google Analytics
      "_ga",
      "_gid",
      "_gat",
      "GA_UUID",
      "_gac_",
      // Facebook
      "fr",
      "fbp",
      "fbc",
      // Mixpanel
      "mp_",
      "__mp",
      // Hotjar
      "_hjid",
      "_hjab",
      "_hjClosedSurveyInvites",
      // Amplitude
      "amplitude_id_",
      "amplitude_test",
      // Segment
      "ajs_",
      "ajs_group_id",
      // Intercom
      "intercom-",
      "intercom_id",
      // General tracking
      "urchin_utm",
      "__ utm",
      "_utm",
    ];

    // Clean localStorage
    Object.keys(localStorage).forEach((key) => {
      if (trackerKeys.some((tracker) => key.includes(tracker))) {
        localStorage.removeItem(key);
      }
    });

    // Clean sessionStorage
    Object.keys(sessionStorage).forEach((key) => {
      if (trackerKeys.some((tracker) => key.includes(tracker))) {
        sessionStorage.removeItem(key);
      }
    });

    console.info("[Setil] Tracker storage cleaned");
  } catch (error) {
    console.warn("[Setil] Storage cleanup error:", error);
  }
};

// ============ FINGERPRINT PROTECTION ============
const patchWebGL = (
  ctx: typeof WebGLRenderingContext | typeof WebGL2RenderingContext,
) => {
  const original = ctx.prototype.getParameter;
  ctx.prototype.getParameter = function (parameter: number) {
    if (parameter === 37445) return "Intel Inc.";
    if (parameter === 37446) return "Intel Iris OpenGL Engine";
    return original.call(this, parameter);
  };
};

const protectFingerprints = async () => {
  const settings = await getFeatureSettings();
  if (!settings.trackingPrevention) return;

  try {
    // Canvas fingerprint protection — add one-bit noise per call, then restore the canvas
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function (
      type?: string,
      quality?: number,
    ) {
      const ctx = this.getContext("2d");
      if (ctx && this.width > 0 && this.height > 0) {
        const imageData = ctx.getImageData(0, 0, this.width, this.height);
        const saved = new Uint8ClampedArray(imageData.data);
        imageData.data[0] = (imageData.data[0] + 1) & 0xff;
        ctx.putImageData(imageData, 0, 0);
        const result = originalToDataURL.call(this, type, quality);
        const restore = ctx.createImageData(this.width, this.height);
        restore.data.set(saved);
        ctx.putImageData(restore, 0, 0);
        return result;
      }
      return originalToDataURL.call(this, type, quality);
    };

    // Spoof hardware concurrency to a fixed value
    Object.defineProperty(navigator, "hardwareConcurrency", {
      get() {
        return 4;
      },
      configurable: true,
    });

    // Normalize device memory to prevent device fingerprinting
    Object.defineProperty(navigator, "deviceMemory", {
      get() {
        return 8;
      },
      configurable: true,
    });

    // Normalize language to prevent fingerprinting
    Object.defineProperty(navigator, "language", {
      get() {
        return "en-US";
      },
      configurable: true,
    });

    Object.defineProperty(navigator, "languages", {
      get() {
        return ["en-US", "en"];
      },
      configurable: true,
    });

    // Spoof timezone to UTC (common baseline)
    const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
    Date.prototype.getTimezoneOffset = function () {
      return 0; // UTC offset
    };

    // WebGL vendor/renderer spoofing
    patchWebGL(WebGLRenderingContext);
    if (typeof WebGL2RenderingContext !== "undefined") {
      patchWebGL(WebGL2RenderingContext);
    }

    console.info("[Setil] Fingerprint protection enabled");
  } catch (error) {
    console.warn("[Setil] Fingerprint protection error:", error);
  }
};

const settings = await getFeatureSettings();
if (settings.trackingPrevention) {

  // Initialize all protections
  void stripTrackingParameters();
  void detectThirdPartyScripts();
  void protectFingerprints();
  void stripReferrer();
  void cleanTrackerStorage();

  // Monitor dynamically added scripts — inspect only the appended node, not the whole document
  const originalAppendChild = Element.prototype.appendChild;
  Element.prototype.appendChild = function <T extends Node>(node: T): T {
    if (node instanceof HTMLScriptElement) {
      void getFeatureSettings().then((settings) => {
        if (settings.trackingPrevention) checkScript(node);
      });
    }
    return originalAppendChild.call(this, node) as T;
  };
}