import { incrementStat } from "../stats";
import { getFeatureSettings } from "../settings";
import { storePassword, updatePassword } from "../api/passwrods"; // Kept your original typo filename string

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const SECRET_KEY = "super-secret-key-change-this";

type Credential = {
  id: number | null;
  username: string | null;
  password: string;
  iv: number[];
  origin: string;
  created_at?: string;
  updated_at?: string;
};

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
//  Storage & Synchronizer Core
// -----------------------------
const saveCredential = async (payload: { username: string | null; password: string; origin: string }) => {
  // 1. Warn if password is leaked
  const isPwned = await checkBreach(payload.password);
  console.log("Breach function called");
  if (isPwned) {
    chrome.notifications.create("breach-warning", {
      type: "basic",
      iconUrl: chrome.runtime.getURL("icons/icon48.png"),
      title: "Security Warning",
      message: "This password was found in a public data breach. Consider changing it!"
    });
  }

  // 2. Local Encryption
  const encrypted = await encrypt(payload.password);
  
  // 3. Check authentication state
  const authData = await chrome.storage.local.get(["token"]);
  const isAuthenticated = !!authData.token;

  // 4. Load current credentials cache to trace existing index/IDs
  const storageResult = await chrome.storage.local.get(["credentials"]);
  let credentials: Credential[] = storageResult.credentials || [];
  
  const existingIndex = credentials.findIndex(
    c => c.origin === payload.origin && c.username === payload.username
  );

  let backendId: number | null = null;
  let serverResponseData: any = null;

  // 5. Run Sync Logic Pipeline
  if (isAuthenticated) {
    try {
      console.log("User authenticated. Attempting backend synchronization of password");
      // Build transmission payload (We pass the raw encrypted array directly to the backend)
      const apiPayload = {
        username: payload.username || "",
        password: JSON.stringify(encrypted.data),
        iv: encrypted.iv,
        origin: payload.origin
      };

      if (existingIndex !== -1 && credentials[existingIndex].id !== null) {
        // If an entry exists and has a backend ID, trigger update API
        const existingId = credentials[existingIndex].id as number;
        console.log(`Updating password entry ${existingId} on backend...`);
        const response = await updatePassword(existingId, apiPayload);
        serverResponseData = response.data;
        backendId = serverResponseData.id;
      } else {
        // Otherwise, send a completely new entry request
        console.log("Storing new password entry to backend...");
        const response = await storePassword(apiPayload);
        serverResponseData = response.data;
        backendId = serverResponseData.id;
      }
    } catch (apiError) {
      console.error("Backend database sync dropped, processing with local fallback execution:", apiError);
    }
  } else {
    console.log("User not logged in. Bypassing backend calls, processing only local client-side tracking.");
  }

  // 6. Build final item to load into local storage state
  const finalEntry: Credential = {
    id: backendId, // Valid server ID integer, or null if unauthenticated/server fails
    username: payload.username,
    password: JSON.stringify(encrypted.data),
    iv: encrypted.iv,
    origin: payload.origin,
    created_at: serverResponseData?.created_at || new Date().toISOString(),
    updated_at: serverResponseData?.updated_at || new Date().toISOString()
  };

  if (existingIndex !== -1) {
    credentials[existingIndex] = finalEntry;
  } else {
    credentials.push(finalEntry);
  }

  await chrome.storage.local.set({ credentials });
};

const getCredentialsForOrigin = async (origin: string) => {
  const result = await chrome.storage.local.get(["credentials"]);
  const credentials: Credential[] = result.credentials || [];

  // Filter accounts for this website
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
  getFeatureSettings().then((settings) => {
    if (!settings.passwordManager) {
      sendResponse({ success: false, error: "Manager disabled" });
      return;
    }

    if (message.type === "SAVE_CREDS") {
      // 1. Immediately acknowledge to the content script so it can safely close/redirect
      sendResponse({ success: true, status: "processing" });
      
      // 2. Process the security pipeline independently in the background
      void handleSaveRequest(message.payload);
    }
    else if (message.type === "GET_CREDS") {
      getCredentialsForOrigin(message.payload.origin).then(sendResponse);
    }
    else if (message.type === "GENERATE_PASSWORD") {
      sendResponse(generatePassword());
    }
  });

  return true; // Keeps the channel open for async handlers like GET_CREDS
});

// Remove sendResponse from this helper since the confirmation was handled above
async function handleSaveRequest(payload: any) {
  try {
    await saveCredential(payload);
    await incrementStat("passwordsProtected");
    console.log("Credentials processing pipeline finished successfully.");
  } catch (error) {
    console.error("Save processing failure chain:", error);
  }
}