import { KeyManagementServiceClient } from "@google-cloud/kms";
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { logger } from "~backend/core/logger";

// Envelope encryption for Vault Share bundles (docs/designs/vault-share-trd.md
// §4.1/§5). Real Google Cloud KMS wraps every data key when GCP_KMS_KEY_NAME
// is set; a deterministic local fallback (derived from BETTER_AUTH_SECRET)
// covers dev so the feature is fully testable without any KMS configured.
// The fallback is refused outright once NODE_ENV=production — it can never
// silently become the real security boundary.
//
// Uses Application Default Credentials (same as backend/prescriptions/
// job-runner.ts's GoogleAuth usage) — the Cloud Run service account, no key
// file. Cloud KMS has no AWS-style "GenerateDataKey" call, so the envelope
// pattern here generates the 32-byte data key locally and wraps just those
// bytes with a single `encrypt` call — same shape, same caller contract.

const KEY_NAME = process.env.GCP_KMS_KEY_NAME;
const isProduction = process.env.NODE_ENV === "production";

let client: KeyManagementServiceClient | null = null;
function kmsClient(): KeyManagementServiceClient {
  if (!client) client = new KeyManagementServiceClient();
  return client;
}

export function isKmsConfigured(): boolean {
  return Boolean(KEY_NAME);
}

/**
 * True once vault encryption can actually run — real KMS when configured, or
 * the local dev fallback when not, but never the fallback in production.
 * Routes that create or read a share bundle must check this and return 503
 * (the same posture as video when LiveKit is unconfigured, Rules.md #6)
 * rather than ever falling through to storing plaintext.
 */
export function vaultEncryptionAvailable(): boolean {
  return isKmsConfigured() || !isProduction;
}

function localKek(): Buffer {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "BETTER_AUTH_SECRET is required (also used to derive the dev-only vault encryption fallback key)"
    );
  }
  return Buffer.from(
    hkdfSync("sha256", secret, "mediflow-vault-dev-kek", "vault-share", 32)
  );
}

function aesGcmEncrypt(plaintext: Buffer, key: Buffer): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]);
}

function aesGcmDecrypt(blob: Buffer, key: Buffer): Buffer {
  const iv = blob.subarray(0, 12);
  const authTag = blob.subarray(12, 28);
  const ciphertext = blob.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export interface DataKey {
  plaintextKey: Buffer;
  wrappedKey: Buffer;
}

/**
 * Cloud KMS has no single call that both generates and wraps a key (unlike
 * AWS's GenerateDataKey), so this generates the plaintext key locally and
 * wraps it with one `encrypt` call — the standard envelope-encryption
 * pattern Google's own KMS docs recommend. Callers must discard
 * `plaintextKey` immediately after use; only `wrappedKey` is ever persisted.
 */
export async function generateDataKey(): Promise<DataKey> {
  if (isKmsConfigured()) {
    const plaintextKey = randomBytes(32);
    const [res] = await kmsClient().encrypt({ name: KEY_NAME, plaintext: plaintextKey });
    if (!res.ciphertext) {
      throw new Error("KMS encrypt returned an incomplete response");
    }
    return { plaintextKey, wrappedKey: Buffer.from(res.ciphertext) };
  }

  if (isProduction) {
    throw new Error(
      "GCP_KMS_KEY_NAME is not configured — vault sharing is unavailable in production without it"
    );
  }

  logger.warn("vault-crypto: GCP_KMS_KEY_NAME unset, using local dev-only key wrapping");
  const plaintextKey = randomBytes(32);
  const wrappedKey = aesGcmEncrypt(plaintextKey, localKek());
  return { plaintextKey, wrappedKey };
}

/** Unwraps a stored data key — the counterpart to generateDataKey(). */
export async function unwrapDataKey(wrappedKey: Buffer): Promise<Buffer> {
  if (isKmsConfigured()) {
    const [res] = await kmsClient().decrypt({ name: KEY_NAME, ciphertext: wrappedKey });
    if (!res.plaintext) throw new Error("KMS decrypt returned an empty response");
    return Buffer.from(res.plaintext);
  }

  if (isProduction) {
    throw new Error(
      "GCP_KMS_KEY_NAME is not configured — cannot unwrap a vault share key in production"
    );
  }

  return aesGcmDecrypt(wrappedKey, localKek());
}

/** Encrypts a share bundle with a one-time data key. The key is never reused. */
export function encryptBundle(plaintextJson: string, dek: Buffer): Buffer {
  return aesGcmEncrypt(Buffer.from(plaintextJson, "utf8"), dek);
}

/** Decrypts a share bundle. Discard `dek` immediately after calling this. */
export function decryptBundle(ciphertext: Buffer, dek: Buffer): string {
  return aesGcmDecrypt(ciphertext, dek).toString("utf8");
}
