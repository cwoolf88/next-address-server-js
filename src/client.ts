import { NextAddressError } from "./errors.js";
import { isIntegrationSimulationScenario } from "./simulation-scenarios.js";
import type {
  AddressChangeHoldStatus,
  ContactSaveResult,
  ContactUpdateQueueResponseBody,
  ContactUpdateRequest,
  ContactUpdateResponseBody,
  MintDirectConnectTokenRequest,
  MintDirectConnectTokenResponseBody,
  SimulateAddressChangeSecurityEventRequest,
  SimulateAddressChangeSecurityEventResponse,
  ArmIntegrationSimulationRequest,
  ArmIntegrationSimulationResponse,
  SimulateFailedAddressUpdateRequest,
  SimulateFailedAddressUpdateResponse,
  TenantConnectRequest,
  TenantConnectionResponseBody,
  TenantDisconnectRequest,
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
   * Save contact info to next-address-primary. On transient failure, enqueues for
   * primary to process twice daily, on restart, or when drained manually.
   */
  async saveContactInfo(
    body: ContactUpdateRequest,
    init?: { idempotencyKey?: string; path?: string; queuePath?: string }
  ): Promise<ContactSaveResult> {
    try {
      return await this.submitContactUpdate(body, init);
    } catch (e) {
      const err = e instanceof NextAddressError ? e : toTransportError(e);
      if (!isQueueableContactUpdateError(err)) throw err;
      return this.enqueueContactUpdate(body, {
        idempotencyKey: init?.idempotencyKey,
        path: init?.queuePath,
      });
    }
  }

  /** PATCH live contact update. */
  private async submitContactUpdate(
    body: ContactUpdateRequest,
    init?: { idempotencyKey?: string; path?: string }
  ): Promise<ContactUpdateResponseBody> {
    return this.requestJson("PATCH", init?.path ?? "/api/v1/contacts/update", body, init, (parsed) => ({
      status: parsed.status as ContactUpdateResponseBody["status"],
      message: typeof parsed.message === "string" ? parsed.message : undefined,
      correlationId:
        typeof parsed.correlationId === "string" ? parsed.correlationId : undefined,
    }));
  }

  /** POST deferred contact update for primary's queue drain. */
  private async enqueueContactUpdate(
    body: ContactUpdateRequest,
    init?: { idempotencyKey?: string; path?: string }
  ): Promise<ContactUpdateQueueResponseBody> {
    return this.requestJson(
      "POST",
      init?.path ?? "/api/v1/contacts/update/queue",
      body,
      init,
      (parsed) => ({
        status: "queued",
        queueId: typeof parsed.queueId === "string" ? parsed.queueId : undefined,
        message: typeof parsed.message === "string" ? parsed.message : undefined,
        correlationId:
          typeof parsed.correlationId === "string" ? parsed.correlationId : undefined,
      })
    );
  }

  /**
   * Mint an opaque connect/disconnect link token for browser flows.
   * Primary resolves tenant from your API key; the token maps to (tenant, externalUserId) server-side.
   */
  async mintDirectConnectToken(
    body: MintDirectConnectTokenRequest,
    init?: { path?: string },
  ): Promise<MintDirectConnectTokenResponseBody> {
    return this.requestJson(
      "POST",
      init?.path ?? "/api/v1/direct-connect-tokens",
      body,
      undefined,
      (parsed) => {
        if (typeof parsed.linkToken !== "string" || typeof parsed.expiresAt !== "string") {
          throw new NextAddressError("Response missing linkToken or expiresAt", "BAD_RESPONSE");
        }
        return {
          linkToken: parsed.linkToken,
          expiresAt: parsed.expiresAt,
        };
      },
    );
  }

  /**
   * POST tenant connect. Default path `/api/v1/tenants/connect` — change if primary uses another route.
   */
  async connectTenant(
    body: TenantConnectRequest = {},
    init?: { idempotencyKey?: string; path?: string }
  ): Promise<TenantConnectionResponseBody> {
    return this.requestJson("POST", init?.path ?? "/api/v1/tenants/connect", body, init, (parsed) => ({
      status: parsed.status as TenantConnectionResponseBody["status"],
      message: typeof parsed.message === "string" ? parsed.message : undefined,
      correlationId:
        typeof parsed.correlationId === "string" ? parsed.correlationId : undefined,
    }));
  }

  /**
   * Simulate a suspicious-network security event on next-address-primary for the linked user.
   * Pauses address changes for 24 hours until the user re-verifies their Clerk email.
   * Primary must allow simulation (non-production or `NEXT_ADDRESS_ALLOW_SIMULATE_SECURITY_HOLD`).
   */
  async simulateAddressChangeSecurityEvent(
    body: SimulateAddressChangeSecurityEventRequest,
    init?: { path?: string },
  ): Promise<SimulateAddressChangeSecurityEventResponse> {
    return this.postJson(
      init?.path ?? "/api/v1/security/simulate-address-change-hold",
      body,
      (parsed) => mapSimulateSecurityEventResponse(parsed),
    );
  }

  /**
   * Arm the next address update to fail from the chosen side (merchant PATCH or NextAddress webhook push).
   * Primary must allow simulation (non-production or `NEXT_ADDRESS_ALLOW_SIMULATE_SECURITY_HOLD`).
   */
  async simulateFailedAddressUpdate(
    body: SimulateFailedAddressUpdateRequest,
  ): Promise<SimulateFailedAddressUpdateResponse> {
    return this.armIntegrationSimulation({
      externalUserId: body.externalUserId,
      scenario:
        body.source === "merchant" ? "sync_failure_merchant" : "sync_failure_nextaddress",
    }).then((result) => {
      if (result.status === "applied") {
        throw new NextAddressError(
          "Expected armed simulation, got applied security hold",
          "BAD_RESPONSE",
        );
      }
      return {
        status: "armed",
        source: body.source,
        message: result.message,
      };
    });
  }

  /**
   * Arm a dev/test scenario (validation errors, sync failures, connectivity issues, etc.).
   * `security_hold` is applied immediately and returns the active hold.
   */
  async armIntegrationSimulation(
    body: ArmIntegrationSimulationRequest,
    init?: { path?: string },
  ): Promise<ArmIntegrationSimulationResponse> {
    return this.postJson(
      init?.path ?? "/api/v1/simulate/arm",
      body,
      (parsed) => mapArmIntegrationSimulationResponse(parsed),
    );
  }

  /**
   * POST tenant disconnect. Default path `/api/v1/tenants/disconnect` — change if primary uses another route.
   */
  async disconnectTenant(
    body: TenantDisconnectRequest = {},
    init?: { idempotencyKey?: string; path?: string }
  ): Promise<TenantConnectionResponseBody> {
    return this.requestJson(
      "POST",
      init?.path ?? "/api/v1/tenants/disconnect",
      body,
      init,
      (parsed) => ({
        status: parsed.status as TenantConnectionResponseBody["status"],
        message: typeof parsed.message === "string" ? parsed.message : undefined,
        correlationId:
          typeof parsed.correlationId === "string" ? parsed.correlationId : undefined,
      })
    );
  }

  private async postJson<T>(
    path: string,
    body: unknown,
    mapResponse: (parsed: Record<string, unknown>) => T,
  ): Promise<T> {
    return this.requestJson("POST", path, body, undefined, mapResponse, { requireStatus: false });
  }

  private async requestJson<T>(
    method: "PATCH" | "POST",
    path: string,
    body: unknown,
    init: { idempotencyKey?: string } | undefined,
    mapResponse: (parsed: Record<string, unknown>) => T,
    options?: { requireStatus?: boolean },
  ): Promise<T> {
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
        method,
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
      if (!isRecord(parsed)) {
        throw new NextAddressError("Response is not a JSON object", "BAD_RESPONSE", res.status, parsed);
      }
      const requireStatus = options?.requireStatus ?? true;
      if (requireStatus && typeof parsed.status !== "string") {
        throw new NextAddressError("Response missing status", "BAD_RESPONSE", res.status, parsed);
      }
      return mapResponse(parsed);
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

function toTransportError(e: unknown): NextAddressError {
  if (e instanceof Error) {
    return new NextAddressError(e.message, "TRANSPORT_ERROR");
  }
  return new NextAddressError("Request failed", "TRANSPORT_ERROR");
}

function mapAddressChangeHoldStatus(parsed: Record<string, unknown>): AddressChangeHoldStatus {
  const hold = parsed.hold;
  if (!isRecord(hold) || typeof hold.id !== "string") {
    throw new NextAddressError("Response missing hold", "BAD_RESPONSE", undefined, parsed);
  }
  return {
    id: hold.id,
    reason: typeof hold.reason === "string" ? hold.reason : "suspicious_network",
    reasonLabel:
      typeof hold.reasonLabel === "string" ? hold.reasonLabel : "Suspicious network activity",
    clientIp: typeof hold.clientIp === "string" ? hold.clientIp : null,
    clientLocationLabel:
      typeof hold.clientLocationLabel === "string" ? hold.clientLocationLabel : null,
    pausedUntil: typeof hold.pausedUntil === "string" ? hold.pausedUntil : new Date().toISOString(),
    reverifiedAt: typeof hold.reverifiedAt === "string" ? hold.reverifiedAt : null,
    isBlocking: hold.isBlocking !== false,
    requiresReverification: hold.requiresReverification !== false,
    waitingForCooldown: hold.waitingForCooldown === true,
    tenantId: typeof hold.tenantId === "string" ? hold.tenantId : null,
    contactQueueId: typeof hold.contactQueueId === "string" ? hold.contactQueueId : null,
  };
}

function mapArmIntegrationSimulationResponse(
  parsed: Record<string, unknown>,
): ArmIntegrationSimulationResponse {
  const status = parsed.status;
  if (status === "applied") {
    if (parsed.scenario !== "security_hold") {
      throw new NextAddressError("Unexpected applied scenario", "BAD_RESPONSE", undefined, parsed);
    }
    return {
      status: "applied",
      scenario: "security_hold",
      message: typeof parsed.message === "string" ? parsed.message : "",
      hold: mapAddressChangeHoldStatus(parsed),
    };
  }
  if (status !== "armed") {
    throw new NextAddressError("Response missing status", "BAD_RESPONSE", undefined, parsed);
  }
  const scenario = parsed.scenario;
  if (!isIntegrationSimulationScenario(scenario)) {
    throw new NextAddressError("Response missing scenario", "BAD_RESPONSE", undefined, parsed);
  }
  return {
    status: "armed",
    scenario,
    message:
      typeof parsed.message === "string"
        ? parsed.message
        : "Simulation armed for the next integration action.",
    hint:
      typeof parsed.hint === "string"
        ? parsed.hint
        : "Trigger the scenario with the next relevant user action.",
  };
}

function mapSimulateSecurityEventResponse(
  parsed: Record<string, unknown>,
): SimulateAddressChangeSecurityEventResponse {
  const status = parsed.status;
  if (status !== "hold_created" && status !== "already_paused") {
    throw new NextAddressError("Response missing status", "BAD_RESPONSE", undefined, parsed);
  }
  const code = parsed.code;
  if (code !== "address_changes_paused" && code !== "suspicious_ip_hold_created") {
    throw new NextAddressError("Response missing code", "BAD_RESPONSE", undefined, parsed);
  }
  const message = typeof parsed.message === "string" ? parsed.message : "";
  return {
    status,
    code,
    message,
    hold: mapAddressChangeHoldStatus(parsed),
  };
}

function isQueueableContactUpdateError(error: NextAddressError): boolean {
  if (error.code === "TIMEOUT" || error.code === "TRANSPORT_ERROR") return true;
  if (error.code === "HTTP_ERROR" && error.status != null && error.status >= 500) return true;
  if (error.code === "HTTP_ERROR" && error.status === 429) return true;
  return false;
}
