import type { WidgetConnectionView } from "./types.js";

/** Default primary settings path when signed in without a per-merchant link. */
export const DEFAULT_PRIMARY_SETTINGS_PATH = "/addresses";

export function connectionSubtitle(view: WidgetConnectionView, tenantName: string): string {
  const app = tenantName || "your app";
  if (view.connected) {
    return `Contact updates from ${app} sync through your shared NextAddress profile.`;
  }
  if (view.signedIntoPrimary) {
    return `Connect ${app} to keep your address and contact info in sync across partners.`;
  }
  return `One address profile for everywhere you shop—sign in to connect ${app}.`;
}

export function connectionStatusTooltip(
  view: WidgetConnectionView,
  mockMode: boolean
): string {
  if (view.statusLoading) {
    return "Checking connection status with NextAddress…";
  }
  if (view.connected) {
    return mockMode
      ? "Connected (mock). Changes you save sync to your NextAddress profile."
      : "Connected. Changes you save in this app sync to your NextAddress profile.";
  }
  return mockMode
    ? "Not connected (mock). Connect to sync contact and address updates."
    : "Not connected. Connect to send contact and address updates to NextAddress.";
}

export function sessionPollRefreshLabel(phase: "sign-in" | "connect" | null): string {
  if (phase === "connect") {
    return "Check connection status again";
  }
  return "Check sign-in status again";
}

export function settingsButtonLabel(signedIntoPrimary: boolean): string {
  return signedIntoPrimary
    ? "Manage your addresses in NextAddress"
    : "Sign in to manage your addresses in NextAddress";
}

export function disconnectButtonLabel(
  signedIntoPrimary: boolean,
  hasDisconnectSignInUrl: boolean
): string {
  if (!signedIntoPrimary && hasDisconnectSignInUrl) {
    return "Sign in to disconnect";
  }
  return "Disconnect account";
}

export function resolvePrimarySettingsUrl(
  primaryBaseUrl: string,
  merchantSettingsPath: string | null
): string {
  const base = primaryBaseUrl.replace(/\/$/, "");
  const path = merchantSettingsPath ?? DEFAULT_PRIMARY_SETTINGS_PATH;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
