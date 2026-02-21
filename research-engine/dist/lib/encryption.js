"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptApiKey = encryptApiKey;
exports.decryptApiKey = decryptApiKey;
exports.validateGeminiApiKey = validateGeminiApiKey;
const crypto_js_1 = __importDefault(require("crypto-js"));
const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET;
if (!ENCRYPTION_SECRET) {
    throw new Error("ENCRYPTION_SECRET environment variable is not set");
}
/**
 * Encrypts a string (e.g., API key) using AES
 */
function encryptApiKey(apiKey) {
    if (!apiKey)
        return "";
    return crypto_js_1.default.AES.encrypt(apiKey, ENCRYPTION_SECRET).toString();
}
/**
 * Decrypts an AES encrypted string
 */
function decryptApiKey(encryptedKey) {
    if (!encryptedKey)
        return "";
    try {
        const bytes = crypto_js_1.default.AES.decrypt(encryptedKey, ENCRYPTION_SECRET);
        return bytes.toString(crypto_js_1.default.enc.Utf8);
    }
    catch (error) {
        console.error("Failed to decrypt API key:", error);
        return "";
    }
}
/**
 * Basic validation for Gemini API key format
 */
function validateGeminiApiKey(apiKey) {
    // Gemini API keys usually start with 'AIzaSy' and are around 39 characters
    return (typeof apiKey === "string" &&
        apiKey.startsWith("AIzaSy") &&
        apiKey.length >= 30);
}
