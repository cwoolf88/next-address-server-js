import {
  contactSyncStateFromError,
  contactSyncStateFromSaveResult,
  type ContactSyncDisplayState,
} from "../sync.js";
import { injectWidgetStyles } from "./widget-styles.js";
import { renderWidget } from "./widget-render.js";
import {
  applyWidgetPalette,
  clearWidgetPalette,
  resolveWidgetPalette,
} from "./themes.js";
import {
  invalidatePrimarySessionCache,
  probePrimaryClerkSession,
} from "./primary-session.js";
import type {
  NextAddressWidgetHandle,
  NextAddressWidgetOptions,
  TenantConnectionInfo,
  WidgetConnectionView,
} from "./types.js";

const DEFAULT_VISIBILITY_REFRESH_MS = 2_000;

function resolveMount(mount: HTMLElement | string): HTMLElement {
  if (typeof mount !== "string") return mount;
  const el = document.querySelector<HTMLElement>(mount);
  if (!el) {
    throw new Error(`NextAddress widget mount not found: ${mount}`);
  }
  return el;
}

/**
 * Optional embed: NextAddress account widget (from paws-and-tails-demo) plus
 * an optional sync status strip. Core SDK methods remain on the main package export.
 */
export function createNextAddressWidget(
  options: NextAddressWidgetOptions
): NextAddressWidgetHandle {
  if (typeof document === "undefined") {
    throw new Error("createNextAddressWidget requires a browser DOM");
  }

  if (options.injectStyles !== false) {
    injectWidgetStyles();
  }

  const container = resolveMount(options.mount);
  container.classList.add("na-widget-host");
  const palette = resolveWidgetPalette(options.theme);
  applyWidgetPalette(container, palette);
  const tenantName = options.tenantName ?? "your app";
  const visibilityRefreshMs = options.visibilityRefreshMs ?? DEFAULT_VISIBILITY_REFRESH_MS;

  let connectionView: WidgetConnectionView = {
    loading: true,
    error: null,
    info: null,
    linked: false,
    signedIntoPrimary: false,
    primaryEmail: null,
    statusLoading: false,
  };

  let syncState: ContactSyncDisplayState =
    options.sync?.initialState ?? { status: "idle" };
  let syncBusy = false;
  let hiddenAt: number | null = null;
  let infoRef: TenantConnectionInfo | null = null;

  function paint(): void {
    renderWidget(
      container,
      connectionView,
      tenantName,
      {
        onSignIn: goToSignIn,
        onConnect: goToConnect,
        onDisconnect: goToDisconnect,
        onOpenSettings: goToSettings,
      },
      options.sync ? syncState : null,
      {
        onRetry: options.sync ? () => void runSync() : undefined,
        retryDisabled: syncBusy,
      }
    );
  }

  async function refreshClerkStatus(connection: TenantConnectionInfo, force = false): Promise<void> {
    if (connection.mockMode || !connection.primaryBaseUrl) {
      connectionView = {
        ...connectionView,
        linked: false,
        signedIntoPrimary: connection.mockMode,
        primaryEmail: null,
        statusLoading: false,
      };
      paint();
      return;
    }
    connectionView = { ...connectionView, statusLoading: true };
    paint();
    try {
      const status = await probePrimaryClerkSession(
        connection.primaryBaseUrl,
        connection.tenantId,
        connection.externalUserId,
        { force }
      );
      connectionView = {
        ...connectionView,
        linked: status.linked,
        signedIntoPrimary: status.signedIn,
        primaryEmail: status.email,
        statusLoading: false,
      };
    } finally {
      connectionView = { ...connectionView, statusLoading: false };
      paint();
    }
  }

  async function refresh(): Promise<void> {
    connectionView = { ...connectionView, loading: true, error: null };
    paint();
    try {
      const info = await options.fetchConnection();
      infoRef = info;
      connectionView = {
        loading: false,
        error: null,
        info,
        linked: connectionView.linked,
        signedIntoPrimary: connectionView.signedIntoPrimary,
        primaryEmail: connectionView.primaryEmail,
        statusLoading: false,
      };
      paint();
      await refreshClerkStatus(info, true);
    } catch (e) {
      connectionView = {
        loading: false,
        error: e instanceof Error ? e.message : "Could not load tenant connection info.",
        info: null,
        linked: false,
        signedIntoPrimary: false,
        primaryEmail: null,
        statusLoading: false,
      };
      paint();
    }
  }

  function navigatePrimary(url: string): void {
    invalidatePrimarySessionCache();
    if (options.navigateToPrimary) {
      options.navigateToPrimary(url);
      return;
    }
    window.location.assign(url);
  }

  function goToSignIn(): void {
    const url = connectionView.info?.connectSignInUrl;
    if (!url) return;
    navigatePrimary(url);
  }

  function goToConnect(): void {
    const url = connectionView.info?.connectUrl;
    if (!url || !connectionView.signedIntoPrimary) return;
    navigatePrimary(url);
  }

  function goToDisconnect(): void {
    const info = connectionView.info;
    if (!info?.disconnectUrl) return;
    if (!connectionView.signedIntoPrimary) {
      if (info.disconnectSignInUrl) navigatePrimary(info.disconnectSignInUrl);
      return;
    }
    navigatePrimary(info.disconnectUrl);
  }

  function goToSettings(): void {
    const base = connectionView.info?.primaryBaseUrl;
    if (!base || !connectionView.signedIntoPrimary) return;
    navigatePrimary(`${base.replace(/\/$/, "")}/addresses`);
  }

  async function runSync(): Promise<void> {
    if (!options.sync) return;
    syncBusy = true;
    syncState = { status: "syncing" };
    paint();
    try {
      const result = await options.sync.onRetry();
      syncState =
        result != null ? contactSyncStateFromSaveResult(result) : { status: "synced" };
    } catch (e) {
      syncState = contactSyncStateFromError(e);
    } finally {
      syncBusy = false;
      paint();
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
  void refresh();

  return {
    getConnectionView: () => ({ ...connectionView }),
    getSyncState: () => syncState,
    setSyncState(state) {
      syncState = state;
      paint();
    },
    reportSyncResult(result) {
      syncState = contactSyncStateFromSaveResult(result);
      paint();
    },
    reportSyncError(error) {
      syncState = contactSyncStateFromError(error);
      paint();
    },
    refresh,
    sync: runSync,
    destroy() {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      container.replaceChildren();
      clearWidgetPalette(container);
      container.classList.remove("na-widget-host");
    },
  };
}
