import {
  contactSyncStateFromError,
  contactSyncStateFromSaveResult,
  type ContactSyncDisplayState,
} from "../sync.js";
import type {
  AddressChangeHoldStatus,
  AddressUpdateFailureSource,
  ArmIntegrationSimulationResponse,
  IntegrationSimulationScenario,
  SimulateFailedAddressUpdateResponse,
} from "../types.js";
import { resolvePrimarySettingsUrl } from "./connection-copy.js";
import {
  openPrimarySettingsTab,
  openPrimarySignInPopup,
  runPrimaryBridge,
  runPrimaryBridgeInHiddenFrame,
} from "./primary-bridge.js";
import {
  invalidatePrimarySessionCache,
  probePrimaryClerkSession,
  type PrimarySession,
} from "./primary-session.js";
import { pollPrimaryClerkSessionUntil } from "./session-poll.js";
import type {
  NextAddressIntegrationHandle,
  NextAddressIntegrationOptions,
  NextAddressIntegrationState,
  SessionPollState,
  TenantConnectionInfo,
  WidgetConnectionView,
} from "./types.js";

const idleSessionPoll = (): SessionPollState => ({
  active: false,
  timedOut: false,
  phase: null,
});

const DEFAULT_VISIBILITY_REFRESH_MS = 2_000;
const CONNECT_POLL_INTERVAL_MS = 1_500;
const SIGN_IN_POLL_TIMEOUT_MS = 120_000;
const CONNECT_POLL_TIMEOUT_MS = 60_000;

function resolveConnectToken(connection: TenantConnectionInfo): string {
  return connection.connectExternalUserId?.trim() || connection.externalUserId;
}

function initialConnectionView(): WidgetConnectionView {
  return {
    loading: true,
    error: null,
    info: null,
    connected: false,
    signedIntoPrimary: false,
    primaryEmail: null,
    merchantSettingsPath: null,
    statusLoading: false,
  };
}

export function canConnectAccount(view: WidgetConnectionView): boolean {
  const info = view.info;
  if (!info || view.statusLoading) return false;
  if (view.signedIntoPrimary) return !!info.connectUrl;
  return !!info.connectSignInUrl;
}

export function canDisconnect(view: WidgetConnectionView): boolean {
  const info = view.info;
  if (!info?.disconnectUrl || view.statusLoading) return false;
  if (!view.signedIntoPrimary) return !!info.disconnectSignInUrl;
  return true;
}

export function canOpenSettings(view: WidgetConnectionView): boolean {
  const info = view.info;
  return !!info?.primaryBaseUrl && view.signedIntoPrimary && !view.statusLoading;
}

export function getSettingsUrl(view: WidgetConnectionView): string | null {
  const info = view.info;
  if (!info?.primaryBaseUrl || !view.signedIntoPrimary) return null;
  return resolvePrimarySettingsUrl(info.primaryBaseUrl, view.merchantSettingsPath);
}

export function shouldShowSessionPollRefresh(
  connection: WidgetConnectionView,
  poll: SessionPollState
): boolean {
  if (!poll.timedOut || poll.active || connection.loading) return false;
  if (poll.phase === "sign-in") return !connection.signedIntoPrimary;
  if (poll.phase === "connect") return !connection.connected;
  return false;
}

/**
 * Headless NextAddress connection + sync controller for custom integration UIs.
 * Mirrors {@link createNextAddressWidget} behavior without rendering DOM.
 */
export function createNextAddressIntegration(
  options: NextAddressIntegrationOptions
): NextAddressIntegrationHandle {
  if (typeof document === "undefined") {
    throw new Error("createNextAddressIntegration requires a browser DOM");
  }

  const tenantName = options.tenantName ?? "your app";
  const visibilityRefreshMs = options.visibilityRefreshMs ?? DEFAULT_VISIBILITY_REFRESH_MS;

  let connectionView = initialConnectionView();
  let syncState: ContactSyncDisplayState =
    options.sync?.initialState ?? { status: "idle" };
  let syncBusy = false;
  let hiddenAt: number | null = null;
  let infoRef: TenantConnectionInfo | null = null;
  let destroyed = false;
  let sessionPoll = idleSessionPoll();
  let connectFlowId = 0;
  let addressChangeHold: AddressChangeHoldStatus | null = null;

  function state(): NextAddressIntegrationState {
    return {
      connection: { ...connectionView },
      sync: syncState,
      syncBusy,
      tenantName,
      sessionPoll: { ...sessionPoll },
      addressChangeHold,
    };
  }

  function setSessionPoll(next: SessionPollState): void {
    sessionPoll = next;
    notify();
  }

  function notify(): void {
    options.onChange?.(state());
  }

  async function refreshClerkStatus(
    connection: TenantConnectionInfo,
    force = false
  ): Promise<void> {
    if (connection.mockMode || !connection.primaryBaseUrl) {
      connectionView = {
        ...connectionView,
        connected: false,
        signedIntoPrimary: connection.mockMode,
        primaryEmail: null,
        merchantSettingsPath: null,
        statusLoading: false,
      };
      notify();
      return;
    }
    connectionView = { ...connectionView, statusLoading: true };
    notify();
    try {
      const status = await probePrimaryClerkSession(
        connection.primaryBaseUrl,
        resolveConnectToken(connection),
        { force }
      );
      connectionView = {
        ...connectionView,
        connected: status.connected,
        signedIntoPrimary: status.signedIn,
        primaryEmail: status.email,
        merchantSettingsPath: status.merchantSettingsPath,
        statusLoading: false,
      };
    } finally {
      connectionView = { ...connectionView, statusLoading: false };
      notify();
    }
  }

  async function refresh(): Promise<void> {
    connectionView = { ...connectionView, loading: true, error: null };
    notify();
    try {
      const info = await options.fetchConnection();
      infoRef = info;
      connectionView = {
        loading: false,
        error: null,
        info,
        connected: connectionView.connected,
        signedIntoPrimary: connectionView.signedIntoPrimary,
        primaryEmail: connectionView.primaryEmail,
        merchantSettingsPath: connectionView.merchantSettingsPath,
        statusLoading: false,
      };
      notify();
      await refreshClerkStatus(info, true);
    } catch (e) {
      connectionView = {
        loading: false,
        error: e instanceof Error ? e.message : "Could not load NextAddress connection info.",
        info: null,
        connected: false,
        signedIntoPrimary: false,
        primaryEmail: null,
        merchantSettingsPath: null,
        statusLoading: false,
      };
      notify();
    }
  }

  async function refreshSession(): Promise<void> {
    const connection = infoRef;
    if (!connection) return;
    invalidatePrimarySessionCache();
    await refreshClerkStatus(connection, true);
  }

  function applySessionStatus(session: PrimarySession): void {
    connectionView = {
      ...connectionView,
      connected: session.connected,
      signedIntoPrimary: session.signedIn,
      primaryEmail: session.email,
      merchantSettingsPath: session.merchantSettingsPath,
    };
    notify();
  }

  function runBridge(url: string, onComplete?: () => void | Promise<void>): void {
    invalidatePrimarySessionCache();
    const done = async () => {
      const connection = infoRef;
      if (connection) {
        await refreshClerkStatus(connection, true);
      }
      await onComplete?.();
    };
    if (options.navigateToPrimary) {
      options.navigateToPrimary(url, done);
      return;
    }
    runPrimaryBridge(url, done);
  }

  function runConnectBridge(
    connectUrl: string,
    onComplete?: () => void | Promise<void>
  ): void {
    invalidatePrimarySessionCache();
    const done = async () => {
      await onComplete?.();
    };
    if (options.navigateToPrimary) {
      options.navigateToPrimary(connectUrl, done);
      return;
    }
    runPrimaryBridgeInHiddenFrame(connectUrl, done);
  }

  function openSignInBridge(signInUrl: string, onComplete?: () => void | Promise<void>): void {
    invalidatePrimarySessionCache();
    const done = async () => {
      await onComplete?.();
    };
    if (options.navigateToPrimary) {
      options.navigateToPrimary(signInUrl, done);
      return;
    }
    openPrimarySignInPopup(signInUrl, done);
  }

  async function pollUntilSignedIn(
    connection: TenantConnectionInfo,
    flowId: number
  ): Promise<boolean> {
    if (connection.mockMode || !connection.primaryBaseUrl) {
      return connection.mockMode;
    }
    setSessionPoll({ active: true, timedOut: false, phase: "sign-in" });
    const session = await pollPrimaryClerkSessionUntil(
      connection.primaryBaseUrl,
      resolveConnectToken(connection),
      (status) => status.signedIn,
      {
        intervalMs: CONNECT_POLL_INTERVAL_MS,
        timeoutMs: SIGN_IN_POLL_TIMEOUT_MS,
        onUpdate: applySessionStatus,
        shouldContinue: () => flowId === connectFlowId,
      }
    );
    if (flowId !== connectFlowId) return false;
    if (session?.signedIn) {
      setSessionPoll(idleSessionPoll());
      return true;
    }
    setSessionPoll({ active: false, timedOut: true, phase: "sign-in" });
    return false;
  }

  async function pollUntilConnected(
    connection: TenantConnectionInfo,
    flowId: number
  ): Promise<boolean> {
    if (connection.mockMode || !connection.primaryBaseUrl) {
      return false;
    }
    setSessionPoll({ active: true, timedOut: false, phase: "connect" });
    const session = await pollPrimaryClerkSessionUntil(
      connection.primaryBaseUrl,
      resolveConnectToken(connection),
      (status) => status.connected,
      {
        intervalMs: CONNECT_POLL_INTERVAL_MS,
        timeoutMs: CONNECT_POLL_TIMEOUT_MS,
        onUpdate: applySessionStatus,
        shouldContinue: () => flowId === connectFlowId,
      }
    );
    if (flowId !== connectFlowId) return false;
    if (session?.connected) {
      setSessionPoll(idleSessionPoll());
      return true;
    }
    setSessionPoll({ active: false, timedOut: true, phase: "connect" });
    return false;
  }

  async function runConnectAccountFlow(options?: { openSignIn?: boolean }): Promise<void> {
    const info = connectionView.info;
    if (!info?.primaryBaseUrl && !info?.mockMode) return;

    const flowId = ++connectFlowId;
    setSessionPoll(idleSessionPoll());

    connectionView = { ...connectionView, statusLoading: true };
    notify();

    try {
      if (!connectionView.signedIntoPrimary) {
        if (!info.connectSignInUrl) return;
        if (options?.openSignIn !== false) {
          openSignInBridge(info.connectSignInUrl);
        }
        const signedIn = await pollUntilSignedIn(info, flowId);
        if (flowId !== connectFlowId || !signedIn) return;
        await refreshClerkStatus(info, true);
      }

      if (flowId !== connectFlowId || connectionView.connected || !info.connectUrl) return;

      const connectPoll = pollUntilConnected(info, flowId);
      runConnectBridge(info.connectUrl, () => {});
      const connected = await connectPoll;
      if (flowId !== connectFlowId) return;
      if (connected) {
        await refreshClerkStatus(info, true);
      }
    } finally {
      if (flowId === connectFlowId) {
        connectionView = { ...connectionView, statusLoading: false };
        notify();
      }
    }
  }

  async function retryConnectSession(): Promise<void> {
    const openSignIn = sessionPoll.phase === "sign-in";
    setSessionPoll(idleSessionPoll());
    await runConnectAccountFlow({ openSignIn });
  }

  function connectAccount(): void {
    const info = connectionView.info;
    if (!info) return;

    if (connectionView.signedIntoPrimary) {
      if (!info.connectUrl || connectionView.connected) return;
      void runConnectAccountFlow();
      return;
    }

    if (!info.connectSignInUrl) return;
    void runConnectAccountFlow();
  }

  function disconnect(): void {
    const info = connectionView.info;
    if (!info?.disconnectUrl) return;
    if (!connectionView.signedIntoPrimary) {
      if (info.disconnectSignInUrl) runBridge(info.disconnectSignInUrl);
      return;
    }
    runBridge(info.disconnectUrl);
  }

  function openSettings(): void {
    const url = getSettingsUrl(connectionView);
    if (!url) return;
    invalidatePrimarySessionCache();
    openPrimarySettingsTab(url);
  }

  function resolveArmScenario():
    | ((scenario: IntegrationSimulationScenario) => Promise<ArmIntegrationSimulationResponse>)
    | undefined {
    return options.simulation?.armScenario;
  }

  function resolveSimulateSecurityHold():
    | (() => Promise<AddressChangeHoldStatus>)
    | undefined {
    return (
      options.simulation?.simulateSecurityHold ?? options.simulateAddressChangeSecurityEvent
    );
  }

  function resolveSimulateFailedAddressUpdate():
    | ((source: AddressUpdateFailureSource) => Promise<SimulateFailedAddressUpdateResponse>)
    | undefined {
    return options.simulation?.simulateFailedAddressUpdate;
  }

  async function armSimulationScenario(
    scenario: IntegrationSimulationScenario,
  ): Promise<ArmIntegrationSimulationResponse | null> {
    const arm = resolveArmScenario();
    if (!arm) return null;
    try {
      const result = await arm(scenario);
      if (result.status === "applied") {
        addressChangeHold = result.hold;
      }
      notify();
      return result;
    } catch (e) {
      connectionView = {
        ...connectionView,
        error: e instanceof Error ? e.message : "Could not arm integration simulation.",
      };
      notify();
      throw e;
    }
  }

  async function simulateSecurityHold(): Promise<AddressChangeHoldStatus | null> {
    const arm = resolveArmScenario();
    if (arm) {
      const result = await armSimulationScenario("security_hold");
      return result?.status === "applied" ? result.hold : null;
    }
    const simulate = resolveSimulateSecurityHold();
    if (!simulate) return null;
    try {
      const hold = await simulate();
      addressChangeHold = hold;
      notify();
      return hold;
    } catch (e) {
      connectionView = {
        ...connectionView,
        error:
          e instanceof Error
            ? e.message
            : "Could not simulate address change security event.",
      };
      notify();
      throw e;
    }
  }

  async function simulateFailedAddressUpdate(
    source: AddressUpdateFailureSource,
  ): Promise<SimulateFailedAddressUpdateResponse | null> {
    const scenario =
      source === "merchant" ? "sync_failure_merchant" : "sync_failure_nextaddress";
    const arm = resolveArmScenario();
    if (arm) {
      const result = await armSimulationScenario(scenario);
      if (!result || result.status !== "armed") return null;
      return {
        status: "armed",
        source,
        message: result.message,
      };
    }
    const simulate = resolveSimulateFailedAddressUpdate();
    if (!simulate) return null;
    try {
      return await simulate(source);
    } catch (e) {
      connectionView = {
        ...connectionView,
        error:
          e instanceof Error ? e.message : "Could not arm failed address update simulation.",
      };
      notify();
      throw e;
    }
  }

  async function runSync(): Promise<void> {
    if (!options.sync) return;
    syncBusy = true;
    syncState = { status: "syncing" };
    notify();
    try {
      const result = await options.sync.onRetry();
      syncState =
        result != null ? contactSyncStateFromSaveResult(result) : { status: "synced" };
    } catch (e) {
      syncState = contactSyncStateFromError(e);
    } finally {
      syncBusy = false;
      notify();
    }
  }

  function onVisibilityChange(): void {
    if (document.visibilityState === "hidden") {
      hiddenAt = Date.now();
      return;
    }
    const connection = infoRef;
    if (!connection) return;
    const hiddenFor = hiddenAt ? Date.now() - hiddenAt : 0;
    hiddenAt = null;
    if (hiddenFor < visibilityRefreshMs) return;
    invalidatePrimarySessionCache();
    void refreshClerkStatus(connection, true);
  }

  document.addEventListener("visibilitychange", onVisibilityChange);
  // Defer so callers (e.g. createNextAddressWidget onChange) can finish assigning the handle first.
  queueMicrotask(() => void refresh());

  return {
    getState: state,
    getConnectionView: () => ({ ...connectionView }),
    getSyncState: () => syncState,
    canConnectAccount: () => canConnectAccount(connectionView),
    canDisconnect: () => canDisconnect(connectionView),
    canOpenSettings: () => canOpenSettings(connectionView),
    getSettingsUrl: () => getSettingsUrl(connectionView),
    connectAccount,
    disconnect,
    openSettings,
    refresh,
    refreshSession,
    getSessionPollState: () => ({ ...sessionPoll }),
    isSessionPollRefreshVisible: () =>
      shouldShowSessionPollRefresh(connectionView, sessionPoll),
    retryConnectSession,
    canArmSimulationScenario: () => typeof resolveArmScenario() === "function",
    armSimulationScenario,
    canSimulateSecurityHold: () =>
      typeof resolveArmScenario() === "function" ||
      typeof resolveSimulateSecurityHold() === "function",
    canSimulateFailedAddressUpdate: () =>
      typeof resolveArmScenario() === "function" ||
      typeof resolveSimulateFailedAddressUpdate() === "function",
    simulateSecurityHold,
    simulateFailedAddressUpdate,
    canSimulateAddressChangeSecurityEvent: () =>
      typeof resolveSimulateSecurityHold() === "function",
    simulateAddressChangeSecurityEvent: simulateSecurityHold,
    setSyncState(next) {
      syncState = next;
      notify();
    },
    reportSyncResult(result) {
      syncState = contactSyncStateFromSaveResult(result);
      notify();
    },
    reportSyncError(error) {
      syncState = contactSyncStateFromError(error);
      notify();
    },
    sync: runSync,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
    },
  };
}
