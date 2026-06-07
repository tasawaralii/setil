window.addEventListener('SETIL_API_ALERT', (event: any) => {
  console.log("[Setil Content Script] Caught custom event from page:", event.detail);
  const { permission, origin } = event.detail;
  
  chrome.runtime.sendMessage({
    type: "LOG_PERMISSION_USE",
    payload: { permission, origin }
  });
});