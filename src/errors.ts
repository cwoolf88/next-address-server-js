export class NextAddressError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status?: number,
    readonly body?: unknown
  ) {
    super(message);
    this.name = "NextAddressError";
  }
}

export class WebhookVerificationError extends NextAddressError {
  constructor(message: string, code: string = "WEBHOOK_VERIFICATION_FAILED") {
    super(message, code);
    this.name = "WebhookVerificationError";
  }
}
