/**
 * Tenant boundary for multi-tenant primary deployments.
 * Mapping from (tenantId, externalUserId) to the primary user lives only on next-address-primary.
 */
export type TenantId = string;

/**
 * User identifier on the 3rd-party system. Never send next-address-primary internal user IDs here.
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
  tenantId: TenantId;
  /** 3rd-party user id; primary resolves linkage server-side */
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
  tenantId: TenantId;
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
  tenantId: TenantId;
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

/** Enable a tenant's integration with next-address-primary. */
export interface TenantConnectRequest {
  tenantId: TenantId;
}

/** Disable a tenant's integration with next-address-primary. */
export interface TenantDisconnectRequest {
  tenantId: TenantId;
}

export type TenantConnectionStatus = "connected" | "disconnected";

export interface TenantConnectionResponseBody {
  status: TenantConnectionStatus;
  message?: string;
  correlationId?: string;
}
