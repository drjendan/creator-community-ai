import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function getEncryptionKey() {
  const value = process.env.APP_ENCRYPTION_KEY;
  if (!value) {
    throw new Error("APP_ENCRYPTION_KEY is required to store tenant API keys.");
  }

  const key = /^[a-f\d]{64}$/i.test(value)
    ? Buffer.from(value, "hex")
    : Buffer.from(value, "base64");

  if (key.length !== 32) {
    throw new Error("APP_ENCRYPTION_KEY must be a 32-byte key encoded as base64 or 64 hexadecimal characters.");
  }

  return key;
}

export function hasValidEncryptionConfiguration() {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}

export function encryptApiKey(apiKey: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(apiKey, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return ["v1", iv.toString("base64"), tag.toString("base64"), ciphertext.toString("base64")].join(".");
}

export function getKeyLastFour(apiKey: string) {
  return apiKey.slice(-4);
}

export function decryptApiKey(value: string) {
  const [version, ivValue, tagValue, ciphertextValue] = value.split(".");
  if (version !== "v1" || !ivValue || !tagValue || !ciphertextValue) throw new Error("The stored API key format is invalid.");
  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(ivValue, "base64"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextValue, "base64")), decipher.final()]).toString("utf8");
}
