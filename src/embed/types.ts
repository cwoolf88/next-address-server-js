import type { ContactSyncDisplayState } from "../sync.js";
import type { ContactSaveResult } from "../types.js";
import type { WidgetTheme } from "./themes.js";

/** Tenant connection metadata (typically from your `/api/tenant/connection` route). */
export type TenantConnectionInfo = {
  tenantId: string;
  externalUserId: string;
  returnUrl: string;
  primaryBaseUrl: string | null;
  connectUrl: string | null;
  disconnectUrl: string | null;
  connectSignInUrl: string | null;
  disconnectSignInUrl: string | null;
  mockMode: boolean;
};

export type WidgetConnectionView = {
  loading: boolean;
  error: string | null;
  info: TenantConnectionInfo | null;
  linked: boolean;
  signedIntoPrimary: boolean;
  primaryEmail: string | null;
  statusLoading: boolean;
};

export type NextAddressWidgetOptions = {
  /** Mount point element or CSS selector. */
  mount: HTMLElement | string;
  /** Load connection URLs and tenant ids from your backend. */
  fetchConnection: () => Promise<TenantConnectionInfo>;
  /** Shown in account copy, e.g. "Paws and Tails". */
  tenantName?: string;
  /**
   * Optional sync subsection (Try again, expandable 4xx errors).
   * Omit to render only the NextAddress account connection widget.
   */
  sync?: {
    onRetry: () => Promise<ContactSaveResult | void>;
    initialState?: ContactSyncDisplayState;
  };
  /** Inject bundled stylesheet. Default true. */
  injectStyles?: boolean;
  /**
   * Visual theme preset and/or custom palette tokens (colors + typography).
   * Presets: `default`, `minimal`, `dark`, `glass`, `vibrant`, `corporate`.
   * Use `theme.fonts` or `theme.colors` for overrides (e.g. `fontFamily`, `fontSize`).
   */
  theme?: WidgetTheme;
  /** Refresh Clerk session after returning from primary (ms). Default 2000. */
  visibilityRefreshMs?: number;
  /**
   * Customize navigation to NextAddress (sign-in, link, unlink). Use a popup so
   * the host page stays put; when omitted, the current tab navigates to the URL.
   */
  navigateToPrimary?: (url: string) => void;
};

export type NextAddressWidgetHandle = {
  getConnectionView(): WidgetConnectionView;
  getSyncState(): ContactSyncDisplayState;
  setSyncState(state: ContactSyncDisplayState): void;
  reportSyncResult(result: ContactSaveResult): void;
  reportSyncError(error: unknown): void;
  /** Re-fetch connection info and primary session status. */
  refresh(): Promise<void>;
  /** Run sync.onRetry when configured. */
  sync(): Promise<void>;
  destroy(): void;
};
