import crypto from "node:crypto";
import { env } from "./env.js";

/**
 * Field-level encryption for sensitive columns (SSNs, payment info, health
 * data, etc). Uses AES-256-GCM, an authenticated cipher: it detects if the
 * ciphertext was tampered with, not just whether it decrypts.
 *
 * The key comes from FIELD_ENCRYPTION_KEY, validated at startup by env.ts.
 * In a real production deployment, swap this for a KMS-backed key (AWS KMS,
 * GCP KMS, HashiCorp Vault) — this env-var version gets you encryption-at-rest
 * working on day one so "add encryption later" stops being the plan.
 */

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  return Buffer.from(env.FIELD_ENCRYPTION_KEY, "hex");
}

export interface EncryptedEnvelope {
  iv: string;
  tag: string;
  ciphertext: string;
}

export function encryptField(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12); // 96-bit IV, recommended for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  const envelope: EncryptedEnvelope = {
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
  return JSON.stringify(envelope);
}

export function decryptField(stored: string): string {
  const key = getKey();
  const envelope: EncryptedEnvelope = JSON.parse(stored);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(envelope.iv, "base64"));
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, "base64")),
    decipher.final(), // throws if the ciphertext was tampered with — that's the point
  ]);
  return plaintext.toString("utf8");
}
