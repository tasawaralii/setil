const injectAPIMonitor = () => {
  const scriptContent = `
    (() => {
      // Hook Geolocation
      if (navigator.geolocation) {
        const originalGetPosition = navigator.geolocation.getCurrentPosition;
        navigator.geolocation.getCurrentPosition = function (success, error, options) {
          window.dispatchEvent(new CustomEvent('SETIL_API_ALERT', { 
            detail: { permission: 'geolocation', origin: window.location.origin } 
          }));
          return originalGetPosition.apply(this, arguments);
        };
      }

      // Hook Clipboard Read
      if (navigator.clipboard) {
        const originalReadText = navigator.clipboard.readText;
        navigator.clipboard.readText = function () {
          window.dispatchEvent(new CustomEvent('SETIL_API_ALERT', { 
            detail: { permission: 'clipboard', origin: window.location.origin } 
          }));
          return originalReadText.apply(this, arguments);
        };
      }
    })();
  `;

  const script = document.createElement("script");
  script.textContent = scriptContent;
  (document.head || document.documentElement).appendChild(script);
  script.remove();
};

// Listen for the custom events fired by our injected script
window.addEventListener('SETIL_API_ALERT', (event: any) => {
  const { permission, origin } = event.detail;
  
  chrome.runtime.sendMessage({
    type: "LOG_PERMISSION_USE",
    payload: { permission, origin }
  });
});

injectAPIMonitor();