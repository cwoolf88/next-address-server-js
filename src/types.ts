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
  /** Primary may include correlation / audit ids */
  correlationId?: string;
}

/** Result of verifying a raw webhook body */
export type VerifiedWebhookPayload = ContactChangeWebhookEvent;

/** Update sent from 3rd party → primary */
export interface ContactUpdateRequest {
  tenantId: TenantId;
  externalUserId: ExternalUserId;
  kind: ContactChangeKind;
  address?: AddressPayload;
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
