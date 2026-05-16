import { incrementStat } from "../stats";
import { getFeatureSettings } from "../settings";
import { isMessageType } from "../messaging";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const SECRET_KEY = "super-secret-key-change-this";

// -----------------------------
//  Crypto & Hashing
// -----------------------------
const getKey = async () => {
  const keyMaterial = await crypto.subtle.digest("SHA-256", encoder.encode(SECRET_KEY));
  return crypto.subtle.importKey("raw", keyMaterial, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
};

const encrypt = async (text: string) => {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(text));
  return { data: Array.from(new Uint8Array(encrypted)), iv: Array.from(iv) };
};

const decrypt = async (data: number[], iv: number[]) => {
  const key = await getKey();
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(iv) }, key, new Uint8Array(data));
  return decoder.decode(decrypted);
};

// Check if password was leaked (k-Anonymity)
const checkBreach = async (password: string): Promise<boolean> => {
  const hashBuffer = await crypto.subtle.digest("SHA-1", encoder.encode(password));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

  const prefix = hashHex.slice(0, 5);
  const suffix = hashHex.slice(5);
  console.log("Checking prefix:", prefix, "Suffix:", suffix);

  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
    if (!res.ok) throw new Error("API Network Error");

    const text = await res.text();
    const found = text.split('\n').some(line => line.split(':')[0].trim() === suffix);

    console.log("Password Breach Found?", found);
    return found;
  } catch (e) {
    console.error("Breach check failed:", e);
    return false;
  }
};

// -----------------------------
//  Storage Helpers (Multi-Account)
// -----------------------------
type Credential = {
  username: string | null;
  password: string; // JSON string of encrypted data
  iv: number[];
  origin: string;
};


const saveCredential = async (payload: { username: string | null; password: string; origin: string }) => {
  // Warn if password is leaked
  const isPwned = await checkBreach(payload.password);
  console.log("Breach function called")
  if (isPwned) {
    chrome.notifications.create("breach-warning", {
      type: "basic",
      iconUrl: chrome.runtime.getURL("icons/icon48.png"),
      title: "Security Warning",
      message: "This password was found in a public data breach. Consider changing it!"
    });
  }

  const encrypted = await encrypt(payload.password);
  const entry: Credential = {
    username: payload.username,
    password: JSON.stringify(encrypted.data),
    iv: encrypted.iv,
    origin: payload.origin
  };

  const result = await chrome.storage.local.get(["credentials"]);
  let credentials: Credential[] = result.credentials || [];

  // Update if same origin + username, otherwise keep existing for multi-account
  const index = credentials.findIndex(c => c.origin === payload.origin && c.username === payload.username);

  if (index !== -1) {
    credentials[index] = entry;
  } else {
    credentials.push(entry);
  }

  await chrome.storage.local.set({ credentials });
};

const getCredentialsForOrigin = async (origin: string) => {
  const result = await chrome.storage.local.get(["credentials"]);
  const credentials: Credential[] = result.credentials || [];

  // Filter all accounts for this website
  const matches = credentials.filter((c) => c.origin === origin);

  // Decrypt all matching accounts
  return Promise.all(matches.map(async (match) => ({
    username: match.username,
    password: await decrypt(JSON.parse(match.password), match.iv)
  })));
};

// -----------------------------
//  Password Generator
// -----------------------------
const generatePassword = () => {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
  const retVal = new Uint32Array(16);
  crypto.getRandomValues(retVal);
  return Array.from(retVal).map((x) => charset[x % charset.length]).join("");
};

// -----------------------------
//  Message Listener
// -----------------------------
chrome.runtime.onMessage.addListener((message: any, sender, sendResponse) => {
  // We check settings first, then pass to an async handler
  getFeatureSettings().then((settings) => {
    if (!settings.passwordManager) {
      sendResponse({ success: false, error: "Manager disabled" });
      return;
    }
    

    if (message.type === "SAVE_CREDS") {
      handleSaveRequest(message.payload, sendResponse);
    }
    else if (message.type === "GET_CREDS") {
      getCredentialsForOrigin(message.payload.origin).then(sendResponse);
    }
    else if (message.type === "GENERATE_PASSWORD") {
      sendResponse(generatePassword());
    }
  });

  return true; 
});

// Create this helper function to handle the async flow
async function handleSaveRequest(payload: any, sendResponse: (response?: any) => void) {
  try {
    await saveCredential(payload);
    await incrementStat("passwordsProtected");
    sendResponse({ success: true });
  } catch (error) {
    console.error("Save failed:", error);
    sendResponse({ success: false });
  }
}