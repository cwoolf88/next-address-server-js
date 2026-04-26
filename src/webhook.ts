import { createHmac, timingSafeEqual } from "node:crypto";
import { WebhookVerificationError } from "./errors.js";
import type { ContactChangeWebhookEvent, VerifiedWebhookPayload } from "./types.js";

const SIGNATURE_HEADER = "x-next-address-signature";
const TIMESTAMP_HEADER = "x-next-address-timestamp";
const DEFAULT_TOLERANCE_SEC = 300;

function hexToBuf(hex: string): Buffer {
  if (hex.length % 2 !== 0) throw new Error("invalid hex");
  return Buffer.from(hex, "hex");
}

/**
 * Verifies HMAC-SHA256 over `${timestamp}.${rawBody}` using the shared webhook secret.
 * Primary should send:
 * - `X-Next-Address-Timestamp`: unix seconds as string
 * - `X-Next-Address-Signature`: lowercase hex HMAC digest
 */
export function verifyWebhookSignature(
  rawBody: string | Buffer,
  headers: Record<string, string | string[] | undefined>,
  secret: string,
  options?: { toleranceSeconds?: number }
): void {
  const tolerance = options?.toleranceSeconds ?? DEFAULT_TOLERANCE_SEC;
  const sigHeader = normalizeHeader(headers[SIGNATURE_HEADER]);
  const tsHeader = normalizeHeader(headers[TIMESTAMP_HEADER]);
  if (!sigHeader || !tsHeader) {
    throw new WebhookVerificationError("Missing signature or timestamp headers");
  }
  const ts = Number(tsHeader);
  if (!Number.isFinite(ts)) {
    throw new WebhookVerificationError("Invalid timestamp");
  }
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > tolerance) {
    throw new WebhookVerificationError("Timestamp outside tolerance", "WEBHOOK_STALE");
  }
  const bodyStr = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
  const payload = `${tsHeader}.${bodyStr}`;
  const expected = createHmac("sha256", secret).update(payload, "utf8").digest("hex");
  const sigBuf = hexToBuf(sigHeader);
  const expBuf = hexToBuf(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    throw new WebhookVerificationError("Invalid signature");
  }
}

/**
 * Parse and lightly validate JSON after signature verification.
 */
export function parseContactWebhookPayload(json: string): VerifiedWebhookPayload {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new WebhookVerificationError("Invalid JSON body", "WEBHOOK_INVALID_JSON");
  }
  if (!isRecord(data)) {
    throw new WebhookVerificationError("Webhook body must be an object");
  }
  const event = data.event;
  if (event !== "contact.changed") {
    throw new WebhookVerificationError(`Unsupported event: ${String(event)}`, "WEBHOOK_UNSUPPORTED_EVENT");
  }
  if (typeof data.tenantId !== "string" || data.tenantId.length === 0) {
    throw new WebhookVerificationError("Missing tenantId");
  }
  if (typeof data.externalUserId !== "string" || data.externalUserId.length === 0) {
    throw new WebhookVerificationError("Missing externalUserId");
  }
  const kind = data.kind;
  const allowed = new Set(["address", "phone", "name", "email"]);
  if (typeof kind !== "string" || !allowed.has(kind)) {
    throw new WebhookVerificationError("Invalid or missing kind");
  }
  if (typeof data.occurredAt !== "string") {
    throw new WebhookVerificationError("Missing occurredAt");
  }
  const out: ContactChangeWebhookEvent = {
    event: "contact.changed",
    occurredAt: data.occurredAt,
    tenantId: data.tenantId,
    externalUserId: data.externalUserId,
    kind: kind as ContactChangeWebhookEvent["kind"],
    correlationId: typeof data.correlationId === "string" ? data.correlationId : undefined,
    address: isRecord(data.address) ? normalizeAddress(data.address) : undefined,
  };
  return out;
}

/**
 * Full pipeline: verify HMAC, parse JSON, return typed event.
 */
export function verifyAndParseWebhook(
  rawBody: string | Buffer,
  headers: Record<string, string | string[] | undefined>,
  secret: string,
  options?: { toleranceSeconds?: number }
): VerifiedWebhookPayload {
  verifyWebhookSignature(rawBody, headers, secret, options);
  const str = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
  return parseContactWebhookPayload(str);
}

export { SIGNATURE_HEADER, TIMESTAMP_HEADER };

function normalizeHeader(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function normalizeAddress(a: Record<string, unknown>): ContactChangeWebhookEvent["address"] {
  const pick = (k: string) => (typeof a[k] === "string" ? (a[k] as string) : undefined);
  return {
    line1: pick("line1"),
    line2: pick("line2"),
    city: pick("city"),
    region: pick("region"),
    postalCode: pick("postalCode"),
    countryCode: pick("countryCode"),
    label: pick("label"),
  };
}
