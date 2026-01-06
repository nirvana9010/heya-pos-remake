import * as crypto from "crypto";

const ENCRYPTION_KEY =
  process.env.PIN_ENCRYPTION_KEY || "default-encryption-key-change-this"; // 32 chars
const IV_LENGTH = 16; // For AES, this is always 16

// Ensure key is exactly 32 bytes
const key = Buffer.from(ENCRYPTION_KEY.padEnd(32).substring(0, 32));

export function encryptPin(pin: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);

  let encrypted = cipher.update(pin);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decryptPin(encryptedPin: string): string {
  const parts = encryptedPin.split(":");
  const iv = Buffer.from(parts.shift()!, "hex");
  const encryptedText = Buffer.from(parts.join(":"), "hex");

  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);

  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString();
}
