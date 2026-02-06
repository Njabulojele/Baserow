import CryptoJS from "crypto-js";

const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET;

if (!ENCRYPTION_SECRET) {
  throw new Error("ENCRYPTION_SECRET environment variable is not set");
}

/**
 * Encrypts a string (e.g., API key) using AES
 */
export function encryptApiKey(apiKey: string): string {
  if (!apiKey) return "";
  return CryptoJS.AES.encrypt(apiKey, ENCRYPTION_SECRET!).toString();
}

/**
 * Decrypts an AES encrypted string
 */
export function decryptApiKey(encryptedKey: string): string {
  if (!encryptedKey) return "";
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedKey, ENCRYPTION_SECRET!);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error("Failed to decrypt API key:", error);
    return "";
  }
}

/**
 * Basic validation for Gemini API key format
 */
export function validateGeminiApiKey(apiKey: string): boolean {
  // Gemini API keys usually start with 'AIzaSy' and are around 39 characters
  return (
    typeof apiKey === "string" &&
    apiKey.startsWith("AIzaSy") &&
    apiKey.length >= 30
  );
}
