import type { ContactSyncDisplayState } from "../sync.js";
import type {
  AddressChangeHoldStatus,
  AddressUpdateFailureSource,
  ArmIntegrationSimulationResponse,
  ContactSaveResult,
  IntegrationSimulationScenario,
  SimulateFailedAddressUpdateResponse,
} from "../types.js";

export type {
  AddressChangeHoldStatus,
  AddressUpdateFailureSource,
  ArmIntegrationSimulationResponse,
  IntegrationSimulationScenario,
  SimulateFailedAddressUpdateResponse,
};
import type { WidgetTheme } from "./themes.js";

/** Connection metadata from your `/api/next-address/connection` route. */
export type TenantConnectionInfo = {
  /** Partner's raw user id (REST/webhooks). */
  externalUserId: string;
  /** Signed connect token for connect/disconnect URLs and embed session probe. */
  connectExternalUserId: string;
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
  connected: boolean;
  signedIntoPrimary: boolean;
  primaryEmail: string | null;
  /**
   * Deep link to merchant settings on primary (from embed session probe).
   * When null but signed in, the widget opens `/addresses` on primary.
   */
  merchantSettingsPath: string | null;
  statusLoading: boolean;
};

/** Connect/sign-in session polling status (after Connect account is clicked). */
export type SessionPollState = {
  active: boolean;
  timedOut: boolean;
  /** `sign-in` while waiting for Clerk; `connect` while waiting for tenant link. */
  phase: "sign-in" | "connect" | null;
};

export type NextAddressIntegrationState = {
  connection: WidgetConnectionView;
  sync: ContactSyncDisplayState;
  syncBusy: boolean;
  tenantName: string;
  sessionPoll: SessionPollState;
  /** Set after {@link NextAddressIntegrationHandle.simulateAddressChangeSecurityEvent}. */
  addressChangeHold: AddressChangeHoldStatus | null;
};

export type NextAddressIntegrationOptions = {
  /** Load connection URLs from your backend. */
  fetchConnection: () => Promise<TenantConnectionInfo>;
  /** Shown in account copy, e.g. "Paws and Tails". */
  tenantName?: string;
  /**
   * Optional contact sync retry handler (same as the packaged widget sync strip).
   */
  sync?: {
    onRetry: () => Promise<ContactSaveResult | void>;
    initialState?: ContactSyncDisplayState;
  };
  /** Refresh Clerk session after returning from primary (ms). Default 2000. */
  visibilityRefreshMs?: number;
  /**
   * Customize navigation to NextAddress (sign-in, connect, disconnect, settings).
   * When omitted, the SDK uses {@link runPrimaryBridge}.
   */
  navigateToPrimary?: (url: string, onComplete?: () => void | Promise<void>) => void;
  /**
   * Dev/demo hooks — wire to tenant API routes backed by {@link NextAddressClient} simulation methods.
   */
  simulation?: {
    armScenario?: (
      scenario: IntegrationSimulationScenario,
    ) => Promise<ArmIntegrationSimulationResponse>;
    /** @deprecated Use `armScenario`. */
    simulateSecurityHold?: () => Promise<AddressChangeHoldStatus>;
    /** @deprecated Use `armScenario` with `sync_failure_merchant` / `sync_failure_nextaddress`. */
    simulateFailedAddressUpdate?: (
      source: AddressUpdateFailureSource,
    ) => Promise<SimulateFailedAddressUpdateResponse>;
  };
  /** @deprecated Use `simulation.simulateSecurityHold`. */
  simulateAddressChangeSecurityEvent?: () => Promise<AddressChangeHoldStatus>;
  /** Called when connection or sync state changes (for custom UI bindings). */
  onChange?: (state: NextAddressIntegrationState) => void;
};

/** Headless API for custom integration UIs — same actions as the packaged widget. */
export type NextAddressIntegrationHandle = {
  getState(): NextAddressIntegrationState;
  getConnectionView(): WidgetConnectionView;
  getSyncState(): ContactSyncDisplayState;
  canConnectAccount(): boolean;
  canDisconnect(): boolean;
  canOpenSettings(): boolean;
  /** Absolute URL to open primary settings, or null when unavailable. */
  getSettingsUrl(): string | null;
  /** Sign in (popup) and connect when needed. */
  connectAccount(): void;
  disconnect(): void;
  openSettings(): void;
  /** Re-fetch tenant connection info and primary session status. */
  refresh(): Promise<void>;
  /** Re-probe primary Clerk session only (no tenant connection fetch). */
  refreshSession(): Promise<void>;
  getSessionPollState(): SessionPollState;
  /** True when polling timed out and a manual refresh should be offered. */
  isSessionPollRefreshVisible(): boolean;
  /** Re-run session polling / connect from the last timed-out phase. */
  retryConnectSession(): Promise<void>;
  canArmSimulationScenario(): boolean;
  armSimulationScenario(
    scenario: IntegrationSimulationScenario,
  ): Promise<ArmIntegrationSimulationResponse | null>;
  canSimulateSecurityHold(): boolean;
  canSimulateFailedAddressUpdate(): boolean;
  simulateSecurityHold(): Promise<AddressChangeHoldStatus | null>;
  simulateFailedAddressUpdate(
    source: AddressUpdateFailureSource,
  ): Promise<SimulateFailedAddressUpdateResponse | null>;
  /** @deprecated Use {@link NextAddressIntegrationHandle.simulateSecurityHold}. */
  canSimulateAddressChangeSecurityEvent(): boolean;
  /** @deprecated Use {@link NextAddressIntegrationHandle.simulateSecurityHold}. */
  simulateAddressChangeSecurityEvent(): Promise<AddressChangeHoldStatus | null>;
  setSyncState(state: ContactSyncDisplayState): void;
  reportSyncResult(result: ContactSaveResult): void;
  reportSyncError(error: unknown): void;
  /** Run sync.onRetry when configured. */
  sync(): Promise<void>;
  destroy(): void;
};

export type NextAddressWidgetOptions = NextAddressIntegrationOptions & {
  /** Mount point element or CSS selector. */
  mount: HTMLElement | string;
  /** Inject bundled stylesheet. Default true. */
  injectStyles?: boolean;
  /**
   * Visual theme preset and/or custom palette tokens (colors + typography).
   * Presets: `default`, `minimal`, `dark`, `glass`, `vibrant`, `corporate`.
   * Use `theme.fonts` or `theme.colors` for overrides (e.g. `fontFamily`, `fontSize`).
   */
  theme?: WidgetTheme;
};

export type NextAddressWidgetHandle = NextAddressIntegrationHandle;
