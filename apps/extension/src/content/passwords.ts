import { getFeatureSettings } from "../settings";

const observedInputs = new WeakSet<HTMLInputElement>();

const getUsernameValue = (input: HTMLInputElement) => {
  const form = input.form;
  const usernameField = form?.querySelector<HTMLInputElement>(
    'input[type="text"], input[type="email"], input[name*="user" i], input[name*="email" i]'
  );

  return usernameField?.value ?? null;
};

const attachPasswordField = (input: HTMLInputElement) => {
  if (observedInputs.has(input)) {
    return;
  }

  observedInputs.add(input);
  input.addEventListener("blur", () => {
    void (async () => {
      const settings = await getFeatureSettings();

      if (!settings.passwordManager || !input.value) {
        return;
      }

      void chrome.runtime.sendMessage({
        type: "SAVE_CREDS",
        payload: {
          username: getUsernameValue(input),
          password: input.value,
          origin: location.origin
        }
      });
    })();
  });
};

const scanPasswordFields = (root: ParentNode = document) => {
  root.querySelectorAll<HTMLInputElement>('input[type="password"]').forEach(attachPasswordField);
};

scanPasswordFields();

const observer = new MutationObserver(() => {
  scanPasswordFields();
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true
});