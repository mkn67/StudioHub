export async function hashPassword(password: string, salt?: string) {
  const saltHex =
    salt ??
    Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("");
  const bytes = new Uint8Array(
    saltHex.match(/.{2}/g)!.map((hex) => parseInt(hex, 16)),
  );
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: bytes, iterations: 120000, hash: "SHA-256" },
    key,
    256,
  );
  return {
    salt: saltHex,
    passwordHash: Array.from(new Uint8Array(bits))
      .map((n) => n.toString(16).padStart(2, "0"))
      .join(""),
  };
}
