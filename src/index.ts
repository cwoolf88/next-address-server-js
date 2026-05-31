export type {
  AddressPayload,
  AnyVerifiedWebhookPayload,
  ContactChangeKind,
  ContactChangeWebhookEvent,
  ContactSaveResult,
  ContactUpdateProcessingStatus,
  ContactUpdateQueueResponseBody,
  ContactUpdateRequest,
  ContactUpdateResponseBody,
  ContactUpdateReviewedEvent,
  ContactUpdateReviewStatus,
  ExternalUserId,
  OutboundWebhookEvent,
  TenantConnectRequest,
  TenantConnectionResponseBody,
  TenantConnectionStatus,
  TenantDisconnectRequest,
  TenantId,
  VerifiedWebhookPayload,
} from "./types.js";

export {
  contactSyncStateFromError,
  contactSyncStateFromPrimaryBatch,
  contactSyncStateFromSaveResult,
  getPrimaryErrorMessage,
  isPrimaryClientError,
  type ContactSyncDisplayState,
} from "./sync.js";

export { NextAddressClient, type NextAddressClientOptions } from "./client.js";
export {
  NextAddressError,
  WebhookVerificationError,
} from "./errors.js";
export {
  parseContactWebhookPayload,
  parseWebhookEvent,
  SIGNATURE_HEADER,
  TIMESTAMP_HEADER,
  verifyAndParseAnyWebhook,
  verifyAndParseWebhook,
  verifyWebhookSignature,
} from "./webhook.js";
