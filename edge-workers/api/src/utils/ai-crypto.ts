/**
 * Helper compartilhado para descriptografia de chaves de API (AI Providers)
 * Padrão: AES-256-GCM com IV de 96 bits.
 */

export async function decryptAiToken(encryptedPayload: string | null | undefined, fallbackSecret: string): Promise<string> {
  if (!encryptedPayload || typeof encryptedPayload !== "string") {
    return "";
  }

  const trimmed = encryptedPayload.trim();
  if (!trimmed.startsWith("enc:v1:")) {
    return trimmed;
  }

  const parts = trimmed.split(":");
  if (parts.length !== 4) {
    throw new Error("[ai-crypto] Formato inválido de token cifrado.");
  }

  const base64Iv = parts[2];
  const base64Ciphertext = parts[3];

  const keyMaterial = new TextEncoder().encode(fallbackSecret);
  const hashBuffer = await crypto.subtle.digest("SHA-256", keyMaterial);
  const key = await crypto.subtle.importKey(
    "raw",
    hashBuffer,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const iv = Uint8Array.from(atob(base64Iv), (c) => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(base64Ciphertext), (c) => c.charCodeAt(0));

  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );
    return new TextDecoder().decode(decryptedBuffer);
  } catch (err) {
    console.error("[ai-crypto] Falha ao descriptografar token:", err);
    throw new Error("Falha na descriptografia da API Key.");
  }
}
