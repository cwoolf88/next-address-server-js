import {
  invalidatePrimarySessionCache,
  probePrimaryClerkSession,
  type PrimarySession,
} from "./primary-session.js";

export type SessionPollOptions = {
  /** Delay between probes. Default 1500ms. */
  intervalMs?: number;
  /** Stop after this duration. Default 120000ms. */
  timeoutMs?: number;
  /** Invoked after each probe so the host UI can update incrementally. */
  onUpdate?: (session: PrimarySession) => void | Promise<void>;
  /** Return false to stop polling early (e.g. superseded by a new connect attempt). */
  shouldContinue?: () => boolean;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/**
 * Polls the primary embed-session endpoint until `predicate` returns true.
 * Returns the matching session, or null on timeout.
 */
export async function pollPrimaryClerkSessionUntil(
  primaryBaseUrl: string,
  connectExternalUserId: string,
  predicate: (session: PrimarySession) => boolean,
  options?: SessionPollOptions
): Promise<PrimarySession | null> {
  const intervalMs = options?.intervalMs ?? 1_500;
  const timeoutMs = options?.timeoutMs ?? 120_000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (options?.shouldContinue && !options.shouldContinue()) {
      return null;
    }
    invalidatePrimarySessionCache();
    const session = await probePrimaryClerkSession(
      primaryBaseUrl,
      connectExternalUserId,
      { force: true }
    );
    await options?.onUpdate?.(session);
    if (predicate(session)) {
      return session;
    }
    await sleep(intervalMs);
  }

  return null;
}
