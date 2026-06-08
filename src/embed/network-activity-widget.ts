import { injectWidgetStyles } from "./widget-styles.js";
import { NetworkActivityLog } from "./network-activity.js";
import { renderNetworkActivityWidget } from "./network-activity-widget-render.js";

export type NextAddressNetworkActivityWidgetOptions = {
  mount: HTMLElement | string;
  /** Shared log instance — create one and pass to {@link createLoggedFetch} helpers in your app. */
  log?: NetworkActivityLog;
  injectStyles?: boolean;
  maxEntries?: number;
  /** Whether the console body is visible. Default false (collapsed). */
  defaultExpanded?: boolean;
};

export type NextAddressNetworkActivityWidgetHandle = {
  getLog(): NetworkActivityLog;
  isExpanded(): boolean;
  setExpanded(expanded: boolean): void;
  toggleExpanded(): void;
  clear(): void;
  destroy(): void;
};

function resolveMount(mount: HTMLElement | string): HTMLElement {
  if (typeof mount !== "string") return mount;
  const el = document.querySelector<HTMLElement>(mount);
  if (!el) {
    throw new Error(`NextAddress network activity widget mount not found: ${mount}`);
  }
  return el;
}

/**
 * Dev console for viewing grouped integration HTTP exchanges (request + response JSON).
 */
export function createNextAddressNetworkActivityWidget(
  options: NextAddressNetworkActivityWidgetOptions,
): NextAddressNetworkActivityWidgetHandle {
  if (typeof document === "undefined") {
    throw new Error("createNextAddressNetworkActivityWidget requires a browser DOM");
  }

  if (options.injectStyles !== false) {
    injectWidgetStyles();
  }

  const log = options.log ?? new NetworkActivityLog();
  const container = resolveMount(options.mount);
  container.classList.add("na-widget-host", "na-network-activity-host");
  let expanded = options.defaultExpanded ?? false;

  function paint(): void {
    let exchanges = log.getExchanges();
    if (options.maxEntries != null && options.maxEntries > 0) {
      exchanges = exchanges.slice(0, options.maxEntries);
    }
    renderNetworkActivityWidget(container, {
      exchanges,
      expanded,
      onToggleExpanded: () => {
        expanded = !expanded;
        paint();
      },
      onClear: () => log.clear(),
    });
  }

  const unsubscribe = log.subscribe(paint);
  paint();

  return {
    getLog: () => log,
    isExpanded: () => expanded,
    setExpanded(next) {
      expanded = next;
      paint();
    },
    toggleExpanded: () => {
      expanded = !expanded;
      paint();
    },
    clear: () => log.clear(),
    destroy() {
      unsubscribe();
      container.replaceChildren();
      container.classList.remove("na-widget-host", "na-network-activity-host");
    },
  };
}
