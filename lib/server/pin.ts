import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

const KEY_LENGTH = 32;
const OPTIONS: ScryptOptions = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function derive(pin: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(pin, salt, KEY_LENGTH, OPTIONS, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

/** Hash PIN untuk disimpan: `scrypt$<salt base64>$<hash base64>`. */
export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(pin, salt);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const [scheme, saltText, keyText, ...rest] = stored.split("$");
  if (scheme !== "scrypt" || !saltText || !keyText || rest.length > 0) return false;
  const expected = Buffer.from(keyText, "base64");
  if (expected.length !== KEY_LENGTH) return false;
  const actual = await derive(pin, Buffer.from(saltText, "base64"));
  return timingSafeEqual(actual, expected);
}
