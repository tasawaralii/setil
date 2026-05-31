const observedInputs = new WeakSet<HTMLInputElement>();
const observedForms = new WeakSet<HTMLFormElement>();

const EYE_OPEN_IMG = `<img src="https://img.icons8.com/?size=100&id=85035&format=png&color=000000" width="16" height="16" style="display:block">`;
const EYE_OFF_IMG = `<img src="https://img.icons8.com/?size=100&id=85028&format=png&color=000000" width="16" height="16" style="display:block">`;
const GEN_IMG = `<img src="https://img.icons8.com/?size=100&id=86563&format=png&color=000000" width="16" height="16" style="display:block">`;
const KEY_IMG = `<img src="https://img.icons8.com/?size=100&id=2896&format=png&color=000000" width="16" height="16" style="display:block">`;

// -----------------------------
//  UI Helpers: Cleaner Styles
// -----------------------------
const createShadowButton = (text: string, title: string) => {
  const btn = document.createElement("button");
  btn.textContent = text;
  btn.title = title;
  btn.type = "button";
  Object.assign(btn.style, {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "4px",
    padding: "2px 6px",
    marginLeft: "4px",
    cursor: "pointer",
    fontSize: "14px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    transition: "transform 0.1s"
  });
  btn.onmousedown = () => (btn.style.transform = "scale(0.95)");
  btn.onmouseup = () => (btn.style.transform = "scale(1)");
  return btn;
};

// -----------------------------
//  Logic: Get Details
// -----------------------------
const getUsernameValue = (input: HTMLInputElement) => {
  const form = input.form;
  if (!form) return null;
  const inputs = Array.from(form.querySelectorAll<HTMLInputElement>("input"));
  const passwordIndex = inputs.indexOf(input);

  for (let i = passwordIndex - 1; i >= 0; i--) {
    const el = inputs[i];
    if (["text", "email"].includes(el.type) || /user|email|login/i.test(el.name + el.id)) {
      return el.value;
    }
  }
  return null;
};

const findConfirmPasswordField = (input: HTMLInputElement) => {
  const form = input.form;
  if (!form) return null;
  const passwordInputs = Array.from(form.querySelectorAll<HTMLInputElement>('input[type="password"]'));
  return passwordInputs.find((el) => el !== input) || null;
};

// -----------------------------
//  UI Component: The Action Container
// -----------------------------
const attachUIContainer = (input: HTMLInputElement) => {
  // Instead of body-fixed positioning, we wrap the input if possible or 
  // place a container immediately after it to prevent "floating" issues.
  const container = document.createElement("div");
  container.className = "password-manager-actions";
  Object.assign(container.style, {
    display: "inline-flex",
    alignItems: "center",
    position: "absolute",
    right: "10px",
    top: "50%",
    transform: "translateY(-50%)",
    zIndex: "100"
  });

  // Ensure the parent is relative so our absolute container sticks to it
  const parent = input.parentElement;
  if (parent) {
    if (getComputedStyle(parent).position === "static") {
      parent.style.position = "relative";
    }
    parent.appendChild(container);
  }

  return container;
};

// -----------------------------
//  Autofill with Multi-Account Support
// -----------------------------
const handleAutofill = (input: HTMLInputElement, container: HTMLElement) => {
  chrome.runtime.sendMessage({
    type: "GET_CREDS",
    payload: { origin: location.origin }
  }, (accounts: any[]) => {
    if (!accounts || accounts.length === 0) return;

    const fillBtn = createShadowButton("", "Select account to fill");
    Object.assign(fillBtn.style, { display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: "0" });
    fillBtn.innerHTML = KEY_IMG;

    // Create a simple dropdown menu
    const menu = document.createElement("div");
    Object.assign(menu.style, {
      position: "absolute",
      top: "100%",
      right: "0",
      background: "white",
      color: "#333",
      border: "1px solid #ccc",
      borderRadius: "4px",
      display: "none",
      flexDirection: "column",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      width: "180px",
      zIndex: "1000"
    });

    accounts.forEach(acc => {
      const item = document.createElement("div");
      item.textContent = acc.username || "Unknown User";
      item.style.padding = "8px";
      item.style.cursor = "pointer";
      item.style.borderBottom = "1px solid #eee";
      item.onmouseover = () => (item.style.background = "#f0f7ff");
      item.onmouseout = () => (item.style.background = "white");

      item.onclick = (e) => {
        e.stopPropagation();
        const userField = input.form?.querySelector<HTMLInputElement>('input[type="text"], input[type="email"]');
        if (userField) userField.value = acc.username;
        input.value = acc.password;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        menu.style.display = "none";
      };
      menu.appendChild(item);
    });

    fillBtn.onclick = (e) => {
      e.stopPropagation();
      menu.style.display = menu.style.display === "none" ? "flex" : "none";
    };

    document.addEventListener("click", () => (menu.style.display = "none"));

    container.appendChild(fillBtn);
    container.appendChild(menu);
  });
};

// -----------------------------
//  Features
// -----------------------------
const attachPasswordField = (input: HTMLInputElement) => {
  if (observedInputs.has(input)) return;
  observedInputs.add(input);

  const container = attachUIContainer(input);

  // 1. Show/Hide Toggle
  const toggleBtn = createShadowButton("", "Toggle visibility");
  Object.assign(toggleBtn.style, { display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: "0" });
  toggleBtn.innerHTML = EYE_OPEN_IMG;
  toggleBtn.onclick = () => {
    input.type = input.type === "password" ? "text" : "password";
    toggleBtn.innerHTML = input.type === "password" ? EYE_OPEN_IMG : EYE_OFF_IMG;
  };
  container.appendChild(toggleBtn);

  // 2. Generate Password
  const genBtn = createShadowButton("", "Generate strong password");
  Object.assign(genBtn.style, { display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: "0" });
  genBtn.innerHTML = GEN_IMG;
  genBtn.onclick = () => {
    chrome.runtime.sendMessage({ type: "GENERATE_PASSWORD" }, (generated: string) => {
      if (!generated) return;
      input.value = generated;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      const confirm = findConfirmPasswordField(input);
      if (confirm) {
        confirm.value = generated;
        confirm.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
  };
  container.appendChild(genBtn);

  // 3. Autofill Logic
  handleAutofill(input, container);

  // 4. Form Submission Logic
  let lastSaveTime = 0;
  const saveCreds = () => {
    if (!input.value) return;
    const now = Date.now();
    if (now - lastSaveTime < 1000) return;
    lastSaveTime = now;
    chrome.runtime.sendMessage({
      type: "SAVE_CREDS",
      payload: {
        username: getUsernameValue(input),
        password: input.value,
        origin: location.origin
      }
    });
  };

  const form = input.form;
  if (form && !observedForms.has(form)) {
    observedForms.add(form);
    form.addEventListener("submit", saveCreds);
  }

  // Also intercept submit button clicks — catches SPA login forms and
  // forms that call preventDefault() on submit without relying on the event.
  const searchRoot: Element = form ?? input.closest("div, section, main") ?? document.body;
  searchRoot.querySelectorAll<HTMLElement>(
    'button[type="submit"], input[type="submit"], button:not([type="button"]):not([type="reset"])'
  ).forEach(btn => btn.addEventListener("click", saveCreds));
};

// -----------------------------
//  Initialization
// -----------------------------
const scan = () => document.querySelectorAll<HTMLInputElement>('input[type="password"]').forEach(attachPasswordField);
scan();
new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });