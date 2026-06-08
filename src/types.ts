/**
 * User identifier on the 3rd-party system. Never send next-address-primary internal user IDs here.
 *
 * For browser connect/disconnect URLs, mint an opaque token via POST /api/v1/direct-connect-tokens, or sign
 * with encodeExternalUserId (api key prefix + user id only — no tenant id).
 * For REST/webhooks, pass your product's raw user id; primary resolves tenant from your API key.
 */
export type ExternalUserId = string;

/** Contact change categories; extend as primary adds channels. */
export type ContactChangeKind =
  | "address"
  | "phone"
  | "name"
  | "email";

export interface AddressPayload {
  line1?: string;
  line2?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  countryCode?: string;
  /** Opaque label from primary (e.g. "home", "billing") */
  label?: string;
}

/** Webhook event envelope from next-address-primary → 3rd party. */
export type OutboundWebhookEvent = ContactChangeWebhookEvent | ContactUpdateReviewedEvent;

export interface ContactChangeWebhookEvent {
  /** Event name for routing/versioning */
  event: "contact.changed";
  /** ISO 8601 when primary emitted the event */
  occurredAt: string;
  /** 3rd-party user id; primary resolves connection server-side */
  externalUserId: ExternalUserId;
  /** What changed; future kinds reuse this envelope */
  kind: ContactChangeKind;
  /** Present when kind === "address"; other kinds add their own payloads later */
  address?: AddressPayload;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  /** Primary may include correlation / audit ids */
  correlationId?: string;
}

/**
 * Fired (to the origin tenant) when a non-certified contact update is approved
 * or rejected in next-address-primary.
 */
export type ContactUpdateReviewStatus = "approved" | "rejected";

export interface ContactUpdateReviewedEvent {
  event: "contact.update.reviewed";
  occurredAt: string;
  externalUserId: ExternalUserId;
  kind: ContactChangeKind;
  status: ContactUpdateReviewStatus;
  /** Echo of the end-user’s decision; included for observability. */
  correlationId?: string;
  address?: AddressPayload;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
}

/** Result of verifying a raw `contact.changed` body */
export type VerifiedWebhookPayload = ContactChangeWebhookEvent;

/** `contact.changed` and `contact.update.reviewed` (same signing scheme) */
export type AnyVerifiedWebhookPayload = OutboundWebhookEvent;

/** Update sent from 3rd party → primary */
export interface ContactUpdateRequest {
  externalUserId: ExternalUserId;
  kind: ContactChangeKind;
  address?: AddressPayload;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  middleInitial?: string;
}

/**
 * Primary indicates whether the change was applied globally or needs end-user review.
 * Exact strings should match next-address-primary API contract.
 */
export type ContactUpdateProcessingStatus =
  | "processed_globally"
  | "pending_user_review"
  | "rejected";

export interface ContactUpdateResponseBody {
  status: ContactUpdateProcessingStatus;
  /** Human-readable detail when rejected or pending */
  message?: string;
  correlationId?: string;
}

export interface ContactUpdateQueueResponseBody {
  status: "queued";
  queueId?: string;
  message?: string;
  correlationId?: string;
}

export type ContactSaveResult =
  | ContactUpdateResponseBody
  | ContactUpdateQueueResponseBody;

/** Tenant is inferred from the Bearer API key — body may be empty. */
export type TenantConnectRequest = Record<string, never>;

/** Tenant is inferred from the Bearer API key — body may be empty. */
export type TenantDisconnectRequest = Record<string, never>;

export type TenantConnectionStatus = "connected" | "disconnected";

export interface TenantConnectionResponseBody {
  status: TenantConnectionStatus;
  message?: string;
  correlationId?: string;
}

export interface MintDirectConnectTokenRequest {
  externalUserId: ExternalUserId;
}

export interface MintDirectConnectTokenResponseBody {
  linkToken: string;
  expiresAt: string;
}

/** Active 24-hour address-change security hold on next-address-primary. */
export type AddressChangeHoldStatus = {
  id: string;
  reason: string;
  reasonLabel: string;
  clientIp: string | null;
  clientLocationLabel: string | null;
  pausedUntil: string;
  reverifiedAt: string | null;
  isBlocking: boolean;
  requiresReverification: boolean;
  waitingForCooldown: boolean;
  tenantId: string | null;
  contactQueueId: string | null;
};

export type AddressChangeSecurityBlockCode =
  | "address_changes_paused"
  | "suspicious_ip_hold_created";

export interface SimulateAddressChangeSecurityEventRequest {
  externalUserId: ExternalUserId;
}

export type SimulateAddressChangeSecurityEventStatus = "hold_created" | "already_paused";

export interface SimulateAddressChangeSecurityEventResponse {
  status: SimulateAddressChangeSecurityEventStatus;
  code: AddressChangeSecurityBlockCode;
  message: string;
  hold: AddressChangeHoldStatus;
}

/** Who should fail on the next address/contact sync attempt. */
export type AddressUpdateFailureSource = "merchant" | "nextaddress";

export interface SimulateFailedAddressUpdateRequest {
  externalUserId: ExternalUserId;
  source: AddressUpdateFailureSource;
}

export interface SimulateFailedAddressUpdateResponse {
  status: "armed";
  source: AddressUpdateFailureSource;
  message: string;
}

import type { IntegrationSimulationScenario } from "./simulation-scenarios.js";

export type { IntegrationSimulationScenario };

export interface ArmIntegrationSimulationRequest {
  externalUserId: ExternalUserId;
  scenario: IntegrationSimulationScenario;
}

export type ArmIntegrationSimulationResponse =
  | {
      status: "armed";
      scenario: IntegrationSimulationScenario;
      message: string;
      hint: string;
    }
  | {
      status: "applied";
      scenario: "security_hold";
      message: string;
      hold: AddressChangeHoldStatus;
    };
