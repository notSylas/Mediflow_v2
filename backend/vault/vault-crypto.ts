import {
  DecryptCommand,
  GenerateDataKeyCommand,
  KMSClient,
} from "@aws-sdk/client-kms";
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { logger } from "~backend/core/logger";

// Envelope encryption for Vault Share bundles (docs/designs/vault-share-trd.md
// §4.1/§5). Real AWS KMS wraps every data key when AWS_KMS_KEY_ID is set; a
// deterministic local fallback (derived from BETTER_AUTH_SECRET) covers dev
// so the feature is fully testable without an AWS account. The fallback is
// refused outright once NODE_ENV=production — it can never silently become
// the real security boundary.

const KEY_ID = process.env.AWS_KMS_KEY_ID;
const REGION = process.env.AWS_REGION ?? "ap-south-1";
const isProduction = process.env.NODE_ENV === "production";

let client: KMSClient | null = null;
function kmsClient(): KMSClient {
  if (!client) client = new KMSClient({ region: REGION });
  return client;
}

export function isKmsConfigured(): boolean {
  return Boolean(KEY_ID);
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
 * One KMS `GenerateDataKey` call returns both a usable plaintext key and that
 * same key already wrapped by the account's master key — the standard AWS
 * envelope-encryption pattern, not a locally-generated key followed by a
 * separate Encrypt call. Callers must discard `plaintextKey` immediately
 * after use; only `wrappedKey` is ever persisted.
 */
export async function generateDataKey(): Promise<DataKey> {
  if (isKmsConfigured()) {
    const res = await kmsClient().send(
      new GenerateDataKeyCommand({ KeyId: KEY_ID, KeySpec: "AES_256" })
    );
    if (!res.Plaintext || !res.CiphertextBlob) {
      throw new Error("KMS GenerateDataKey returned an incomplete response");
    }
    return {
      plaintextKey: Buffer.from(res.Plaintext),
      wrappedKey: Buffer.from(res.CiphertextBlob),
    };
  }

  if (isProduction) {
    throw new Error(
      "AWS_KMS_KEY_ID is not configured — vault sharing is unavailable in production without it"
    );
  }

  logger.warn("vault-crypto: AWS_KMS_KEY_ID unset, using local dev-only key wrapping");
  const plaintextKey = randomBytes(32);
  const wrappedKey = aesGcmEncrypt(plaintextKey, localKek());
  return { plaintextKey, wrappedKey };
}

/** Unwraps a stored data key — the counterpart to generateDataKey(). */
export async function unwrapDataKey(wrappedKey: Buffer): Promise<Buffer> {
  if (isKmsConfigured()) {
    const res = await kmsClient().send(
      new DecryptCommand({ CiphertextBlob: wrappedKey, KeyId: KEY_ID })
    );
    if (!res.Plaintext) throw new Error("KMS Decrypt returned an empty response");
    return Buffer.from(res.Plaintext);
  }

  if (isProduction) {
    throw new Error(
      "AWS_KMS_KEY_ID is not configured — cannot unwrap a vault share key in production"
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
