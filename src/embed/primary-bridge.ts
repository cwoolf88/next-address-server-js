/** Posted from the host app's bridge-return page when a popup/iframe flow finishes. */
export const NEXTADDRESS_BRIDGE_COMPLETE = "next-address-bridge-complete";

const POPUP_NAME = "nextaddress-bridge";
const POPUP_FEATURES = "width=520,height=720";
const HIDDEN_FRAME_TIMEOUT_MS = 30_000;

export function isPrimarySignInUrl(url: string): boolean {
  try {
    return new URL(url).pathname.startsWith("/sign-in");
  } catch {
    return url.includes("/sign-in");
  }
}

function isPrimaryConnectOrDisconnectUrl(url: string): boolean {
  try {
    const path = new URL(url).pathname;
    return path.startsWith("/connect") || path.startsWith("/disconnect");
  } catch {
    return url.includes("/connect") || url.includes("/disconnect");
  }
}

function openPrimaryPopup(
  url: string,
  onComplete: () => void | Promise<void>
): void {
  const opened = window.open(url, POPUP_NAME, POPUP_FEATURES);
  if (!opened) {
    window.location.assign(url);
    return;
  }
  const popup = opened;

  let done = false;
  const hostOrigin = window.location.origin;

  function cleanup() {
    window.removeEventListener("message", onMessage);
    window.clearInterval(pollTimer);
  }

  async function finish() {
    if (done) return;
    done = true;
    cleanup();
    try {
      popup.close();
    } catch {
      /* already closed */
    }
    await onComplete();
  }

  function onMessage(event: MessageEvent) {
    if (event.origin !== hostOrigin) return;
    const data = event.data as { type?: string } | null;
    if (data?.type !== NEXTADDRESS_BRIDGE_COMPLETE) return;
    void finish();
  }

  const pollTimer = window.setInterval(() => {
    if (popup.closed) void finish();
  }, 400);

  window.addEventListener("message", onMessage);
}

/**
 * Opens NextAddress sign-in in a popup. The host page stays put; the popup should
 * finish on a bridge-return URL that posts {@link NEXTADDRESS_BRIDGE_COMPLETE}.
 */
export function openPrimarySignInPopup(
  url: string,
  onComplete: () => void | Promise<void>
): void {
  openPrimaryPopup(url, onComplete);
}

/** Opens primary settings in a new tab/window; never navigates the host page. */
export function openPrimarySettingsTab(url: string): void {
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (opened) return;

  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/** Runs connect/disconnect on primary in a hidden iframe; host page stays put. */
export function runPrimaryBridgeInHiddenFrame(
  url: string,
  onComplete: () => void | Promise<void>
): void {
  const iframe = document.createElement("iframe");
  iframe.hidden = true;
  iframe.title = "NextAddress account connection";

  let done = false;
  const hostOrigin = window.location.origin;
  const timeout = window.setTimeout(() => void finish(), HIDDEN_FRAME_TIMEOUT_MS);

  function teardown() {
    window.clearTimeout(timeout);
    window.removeEventListener("message", onMessage);
    iframe.remove();
  }

  async function finish() {
    if (done) return;
    done = true;
    teardown();
    await onComplete();
  }

  function onMessage(event: MessageEvent) {
    if (event.origin !== hostOrigin) return;
    const data = event.data as { type?: string } | null;
    if (data?.type !== NEXTADDRESS_BRIDGE_COMPLETE) return;
    void finish();
  }

  window.addEventListener("message", onMessage);
  iframe.src = url;
  document.body.appendChild(iframe);
}

export type PrimaryBridgeRunner = (
  url: string,
  onComplete: () => void | Promise<void>
) => void;

/**
 * Sign-in opens a popup (never navigates the host). Connect/disconnect use a
 * hidden iframe when no custom navigator is supplied.
 */
export const runPrimaryBridge: PrimaryBridgeRunner = (url, onComplete) => {
  if (isPrimarySignInUrl(url)) {
    openPrimarySignInPopup(url, onComplete);
    return;
  }
  if (isPrimaryConnectOrDisconnectUrl(url)) {
    runPrimaryBridgeInHiddenFrame(url, onComplete);
    return;
  }
  openPrimarySettingsTab(url);
  void onComplete();
};

/**
 * Opens sign-in in a popup, then runs connect in a hidden iframe when a connect
 * URL is available.
 */
export function runConnectAccountFlow(
  signInUrl: string,
  connectUrl: string | null,
  onComplete: () => void | Promise<void>,
  runBridge: PrimaryBridgeRunner = runPrimaryBridge
): void {
  runBridge(signInUrl, async () => {
    if (connectUrl) {
      runBridge(connectUrl, onComplete);
      return;
    }
    await onComplete();
  });
}
