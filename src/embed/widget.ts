import { injectWidgetStyles } from "./widget-styles.js";
import { renderWidget } from "./widget-render.js";
import { createNextAddressIntegration } from "./integration.js";
import {
  applyWidgetPalette,
  clearWidgetPalette,
  resolveWidgetPalette,
} from "./themes.js";
import type {
  NextAddressWidgetHandle,
  NextAddressWidgetOptions,
} from "./types.js";

function resolveMount(mount: HTMLElement | string): HTMLElement {
  if (typeof mount !== "string") return mount;
  const el = document.querySelector<HTMLElement>(mount);
  if (!el) {
    throw new Error(`NextAddress widget mount not found: ${mount}`);
  }
  return el;
}

/**
 * Packaged NextAddress account widget plus an optional sync status strip.
 * For custom UIs, use {@link createNextAddressIntegration} instead.
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

  let integration!: ReturnType<typeof createNextAddressIntegration>;

  function paint(): void {
    const { connection, sync, syncBusy, tenantName, sessionPoll } = integration.getState();
    renderWidget(
      container,
      connection,
      tenantName,
      {
        onConnectAccount: () => integration.connectAccount(),
        onDisconnect: () => integration.disconnect(),
        onOpenSettings: () => integration.openSettings(),
        onRetryConnectSession: () => void integration.retryConnectSession(),
      },
      options.sync ? sync : null,
      {
        onRetry: options.sync ? () => void integration.sync() : undefined,
        retryDisabled: syncBusy,
      },
      sessionPoll
    );
  }

  integration = createNextAddressIntegration({
    fetchConnection: options.fetchConnection,
    tenantName: options.tenantName,
    sync: options.sync,
    visibilityRefreshMs: options.visibilityRefreshMs,
    navigateToPrimary: options.navigateToPrimary,
    simulation: options.simulation,
    simulateAddressChangeSecurityEvent: options.simulateAddressChangeSecurityEvent,
    onChange: () => paint(),
  });

  paint();

  return {
    ...integration,
    destroy() {
      integration.destroy();
      container.replaceChildren();
      clearWidgetPalette(container);
      container.classList.remove("na-widget-host");
    },
  };
}
