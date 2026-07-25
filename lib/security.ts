import crypto from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

const encoder = new TextEncoder();

function secret(name: string, fallback?: string) {
  const value = process.env[name] || fallback;
  if (process.env[name]) return process.env[name]!;
  if (fallback && process.env.NODE_ENV !== "production") return fallback;
  if (!value) throw new Error(`${name} is not configured`);
  if (process.env.NODE_ENV === "production") throw new Error(`${name} is not configured`);
  return value;
}

export function hashIdentifier(value: string) {
  return crypto.createHash("sha256").update(`${secret("ASSESSMENT_SIGNING_SECRET", "development-only-secret")}:${value}`).digest("hex");
}

export async function signCuratorSession(subject: string) {
  return new SignJWT({ role: "curator" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(subject)
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(encoder.encode(secret("CURATOR_SESSION_SECRET", "development-curator-secret")));
}

export async function verifyCuratorSession(token?: string) {
  if (!token) return null;
  try {
    const result = await jwtVerify(
      token,
      encoder.encode(secret("CURATOR_SESSION_SECRET", "development-curator-secret"))
    );
    return result.payload.role === "curator" ? result.payload.sub || null : null;
  } catch {
    return null;
  }
}

function encryptionKey() {
  const configured = process.env.TOKEN_ENCRYPTION_KEY;
  if (!configured && process.env.NODE_ENV !== "production") {
    return crypto.createHash("sha256").update("nemesys-development-encryption-key").digest();
  }
  const key = Buffer.from(secret("TOKEN_ENCRYPTION_KEY"), "base64");
  if (key.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must decode to 32 bytes");
  return key;
}

export function encryptToken(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptToken(value: string) {
  const [ivEncoded, tagEncoded, encryptedEncoded] = value.split(".");
  if (!ivEncoded || !tagEncoded || !encryptedEncoded) throw new Error("Encrypted token is malformed");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivEncoded, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedEncoded, "base64url")),
    decipher.final()
  ]).toString("utf8");
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function signDeviceId(id: string) {
  const signature = crypto
    .createHmac("sha256", secret("ASSESSMENT_SIGNING_SECRET", "development-only-secret"))
    .update(id)
    .digest("base64url");
  return `${id}.${signature}`;
}

export function verifyDeviceId(value?: string) {
  if (!value) return null;
  const split = value.lastIndexOf(".");
  if (split < 1) return null;
  const id = value.slice(0, split);
  const expected = signDeviceId(id);
  if (expected.length !== value.length) return null;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(value)) ? id : null;
}
