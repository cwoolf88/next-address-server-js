export type {
  AddressPayload,
  ContactChangeKind,
  ContactChangeWebhookEvent,
  ContactUpdateProcessingStatus,
  ContactUpdateRequest,
  ContactUpdateResponseBody,
  ExternalUserId,
  TenantId,
  VerifiedWebhookPayload,
} from "./types.js";

export { NextAddressClient, type NextAddressClientOptions } from "./client.js";
export {
  NextAddressError,
  WebhookVerificationError,
} from "./errors.js";
export {
  parseContactWebhookPayload,
  SIGNATURE_HEADER,
  TIMESTAMP_HEADER,
  verifyAndParseWebhook,
  verifyWebhookSignature,
} from "./webhook.js";
