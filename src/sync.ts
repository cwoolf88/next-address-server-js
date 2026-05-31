import { NextAddressError } from "./errors.js";
import type { ContactSaveResult } from "./types.js";

export type ContactSyncDisplayState =
  | { status: "idle" }
  | { status: "syncing" }
  | { status: "synced" }
  | { status: "queued" }
  | {
      status: "failed";
      errorMessage: string;
      httpStatus?: number;
      retryable: boolean;
    };

export function isPrimaryClientError(error: NextAddressError): boolean {
  return (
    error.code === "HTTP_ERROR" &&
    error.status != null &&
    error.status >= 400 &&
    error.status < 500
  );
}

/** User-facing message from a next-address-primary error body or fallback. */
export function getPrimaryErrorMessage(error: NextAddressError): string {
  const body = error.body;
  if (isRecord(body)) {
    if (typeof body.message === "string" && body.message.length > 0) {
      return body.message;
    }
    if (typeof body.error === "string" && body.error.length > 0) {
      return body.error;
    }
  }
  return error.message;
}

export function contactSyncStateFromError(error: unknown): ContactSyncDisplayState {
  if (!(error instanceof NextAddressError)) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return { status: "failed", errorMessage: message, retryable: true };
  }
  const clientError = isPrimaryClientError(error);
  return {
    status: "failed",
    errorMessage: getPrimaryErrorMessage(error),
    httpStatus: error.status,
    retryable: clientError || error.code === "TIMEOUT" || error.code === "TRANSPORT_ERROR",
  };
}

/** Map multi-patch primary results (e.g. paws-and-tails-demo) to sync card state. */
export function contactSyncStateFromPrimaryBatch(
  results: Array<{
    status: string;
    message?: string;
    error?: string;
    httpStatus?: number;
  }>,
  attemptedPrimary: boolean
): ContactSyncDisplayState {
  if (!attemptedPrimary || results.length === 0) {
    return { status: "idle" };
  }
  const ok = (s: string) => s === "processed_globally" || s === "pending_user_review";
  if (results.every((r) => ok(r.status))) {
    return { status: "synced" };
  }
  const failed = results.filter((r) => !ok(r.status));
  const httpStatus = failed.find((r) => r.httpStatus != null)?.httpStatus;
  const lines = failed
    .map((r) => r.message ?? r.error)
    .filter((m): m is string => Boolean(m));
  return {
    status: "failed",
    errorMessage: lines.length > 0 ? lines.join("\n") : "Contact update was not accepted",
    httpStatus,
    retryable: httpStatus == null || (httpStatus >= 400 && httpStatus < 500),
  };
}

export function contactSyncStateFromSaveResult(
  result: ContactSaveResult
): ContactSyncDisplayState {
  if (result.status === "queued") {
    return { status: "queued" };
  }
  if (result.status === "rejected") {
    return {
      status: "failed",
      errorMessage: result.message ?? "Contact update was rejected",
      retryable: false,
    };
  }
  return { status: "synced" };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
