import { createHmac, timingSafeEqual } from "node:crypto";

/** Opaque link token prefix (NextAddress external user id, version 1). */
export const EXTERNAL_USER_ID_PREFIX = "naeu1";

export type DecodedExternalUserId = {
  tenantId: string;
  userId: string;
};

export type EncodeExternalUserIdInput = {
  /** Short API key prefix issued at registration (not the internal tenant id). */
  apiKeyPrefix: string;
  /** Partner's user id in your product. */
  userId: string;
};

function base64UrlEncode(value: Buffer | string): string {
  const buf = typeof value === "string" ? Buffer.from(value, "utf8") : value;
  return buf.toString("base64url");
}

function base64UrlDecode(value: string): Buffer {
  return Buffer.from(value, "base64url");
}

function signPayload(payloadB64: string, signingSecret: string): Buffer {
  return createHmac("sha256", signingSecret)
    .update(`${EXTERNAL_USER_ID_PREFIX}.${payloadB64}`)
    .digest();
}

/**
 * Build a signed link token embedding api key prefix + partner user id (no tenant id).
 * Prefer minting opaque tokens via POST /api/v1/direct-connect-tokens when possible.
 */
export function encodeExternalUserId(
  input: EncodeExternalUserIdInput,
  signingSecret: string,
): string {
  const apiKeyPrefix = input.apiKeyPrefix.trim();
  const userId = input.userId.trim();
  if (!apiKeyPrefix || !userId) {
    throw new Error("apiKeyPrefix and userId are required");
  }
  if (!signingSecret.trim()) {
    throw new Error("signingSecret is required");
  }

  const payloadB64 = base64UrlEncode(
    JSON.stringify({ p: apiKeyPrefix, u: userId }),
  );
  const sigB64 = base64UrlEncode(signPayload(payloadB64, signingSecret.trim()));
  return `${EXTERNAL_USER_ID_PREFIX}.${apiKeyPrefix}.${payloadB64}.${sigB64}`;
}

export function isEncodedExternalUserId(value: string): boolean {
  return value.trim().startsWith(`${EXTERNAL_USER_ID_PREFIX}.`);
}

function parsePayloadSegment(payloadB64: string): { apiKeyPrefix: string; userId: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(base64UrlDecode(payloadB64).toString("utf8"));
  } catch {
    throw new Error("Invalid external_user_id payload");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid external_user_id payload");
  }
  const record = parsed as { p?: unknown; u?: unknown; t?: unknown };
  const userId = typeof record.u === "string" ? record.u.trim() : "";
  if (!userId) {
    throw new Error("Invalid external_user_id payload");
  }
  const apiKeyPrefix =
    typeof record.p === "string"
      ? record.p.trim()
      : typeof record.t === "string"
        ? record.t.trim()
        : "";
  if (!apiKeyPrefix) {
    throw new Error("Invalid external_user_id payload");
  }
  return { apiKeyPrefix, userId };
}

/**
 * Decode a signed external user id. Resolves tenant via api key prefix (or legacy tenant id in payload).
 */
export async function decodeExternalUserId(
  token: string,
  resolveSigningSecret: (lookupKey: string) => string | null | Promise<string | null>,
  resolveTenantId?: (lookupKey: string) => string | null | Promise<string | null>,
): Promise<DecodedExternalUserId> {
  const trimmed = token.trim();
  if (!isEncodedExternalUserId(trimmed)) {
    throw new Error("external_user_id must be a signed link token");
  }

  const parts = trimmed.split(".");
  if (parts.length < 3 || parts[0] !== EXTERNAL_USER_ID_PREFIX) {
    throw new Error("Malformed external_user_id token");
  }

  let apiKeyPrefix: string;
  let payloadB64: string;
  let sigB64: string;

  if (parts.length === 4) {
    apiKeyPrefix = parts[1]!.trim();
    payloadB64 = parts[2]!;
    sigB64 = parts[3]!;
    if (!apiKeyPrefix) {
      throw new Error("Malformed external_user_id token");
    }
  } else if (parts.length === 3) {
    payloadB64 = parts[1]!;
    sigB64 = parts[2]!;
    const decoded = parsePayloadSegment(payloadB64);
    apiKeyPrefix = decoded.apiKeyPrefix;
  } else {
    throw new Error("Malformed external_user_id token");
  }

  const decoded = parsePayloadSegment(payloadB64);
  if (parts.length === 4 && decoded.apiKeyPrefix !== apiKeyPrefix) {
    throw new Error("Invalid external_user_id payload");
  }

  const secret = await resolveSigningSecret(apiKeyPrefix);
  if (!secret?.trim()) {
    throw new Error("No signing secret configured for tenant");
  }

  const expected = signPayload(payloadB64, secret.trim());
  let actual: Buffer;
  try {
    actual = base64UrlDecode(sigB64);
  } catch {
    throw new Error("Invalid external_user_id signature");
  }

  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new Error("Invalid external_user_id signature");
  }

  const tenantId = resolveTenantId
    ? await resolveTenantId(apiKeyPrefix)
    : apiKeyPrefix;
  if (!tenantId?.trim()) {
    throw new Error("Unknown tenant for link token");
  }

  return { tenantId: tenantId.trim(), userId: decoded.userId };
}
