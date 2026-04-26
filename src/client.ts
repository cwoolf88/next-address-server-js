import { NextAddressError } from "./errors.js";
import type {
  ContactUpdateRequest,
  ContactUpdateResponseBody,
} from "./types.js";

export interface NextAddressClientOptions {
  /** Must be https in production; enforced unless allowInsecureLocalhost is true */
  baseUrl: string;
  /** API credential issued by next-address-primary (store as secret) */
  apiKey: string;
  /** Optional custom fetch (testing) */
  fetchImpl?: typeof fetch;
  /** Allow http only for localhost (dev) */
  allowInsecureLocalhost?: boolean;
  /** Request timeout ms */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT = 30_000;

function assertHttps(url: string, allowLocal: boolean): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new NextAddressError("Invalid baseUrl", "INVALID_BASE_URL");
  }
  if (parsed.protocol === "https:") return;
  if (allowLocal && parsed.hostname === "localhost" && parsed.protocol === "http:") return;
  if (allowLocal && parsed.hostname === "127.0.0.1" && parsed.protocol === "http:") return;
  throw new NextAddressError(
    "baseUrl must use https (or http://localhost for local dev)",
    "INSECURE_BASE_URL"
  );
}

/**
 * Server-side client for pushing contact updates to next-address-primary.
 * Uses Bearer API key over TLS; align path with your primary OpenAPI/route.
 */
export class NextAddressClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: NextAddressClientOptions) {
    assertHttps(options.baseUrl, options.allowInsecureLocalhost ?? false);
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT;
    if (typeof this.fetchImpl !== "function") {
      throw new NextAddressError("fetch is not available (Node 18+ required)", "NO_FETCH");
    }
  }

  /**
   * POST contact update. Default path `/api/v1/contacts/update` — change if primary uses another route.
   */
  async submitContactUpdate(
    body: ContactUpdateRequest,
    init?: { idempotencyKey?: string; path?: string }
  ): Promise<ContactUpdateResponseBody> {
    const path = init?.path ?? "/api/v1/contacts/update";
    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), this.timeoutMs);
    const headers: Record<string, string> = {
      "content-type": "application/json",
      authorization: `Bearer ${this.apiKey}`,
    };
    if (init?.idempotencyKey) {
      headers["idempotency-key"] = init.idempotencyKey;
    }
    try {
      const res = await this.fetchImpl(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const text = await res.text();
      let parsed: unknown;
      try {
        parsed = text ? JSON.parse(text) : {};
      } catch {
        throw new NextAddressError("Invalid JSON in response", "BAD_RESPONSE", res.status, text);
      }
      if (!res.ok) {
        throw new NextAddressError(
          `Request failed: ${res.status}`,
          "HTTP_ERROR",
          res.status,
          parsed
        );
      }
      if (!isRecord(parsed) || typeof parsed.status !== "string") {
        throw new NextAddressError("Response missing status", "BAD_RESPONSE", res.status, parsed);
      }
      return {
        status: parsed.status as ContactUpdateResponseBody["status"],
        message: typeof parsed.message === "string" ? parsed.message : undefined,
        correlationId:
          typeof parsed.correlationId === "string" ? parsed.correlationId : undefined,
      };
    } catch (e) {
      if (e instanceof NextAddressError) throw e;
      if (e instanceof Error && e.name === "AbortError") {
        throw new NextAddressError("Request timed out", "TIMEOUT");
      }
      throw e;
    } finally {
      clearTimeout(t);
    }
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
