import type { ArmIntegrationSimulationResponse } from "../types.js";
import { scenarioArmHint } from "../simulation-scenarios.js";
import { SimulationEventLog } from "./simulation-events.js";
import { injectWidgetStyles } from "./widget-styles.js";
import { renderSimulationWidget } from "./simulation-widget-render.js";
import type { IntegrationSimulationScenario, NextAddressIntegrationHandle } from "./types.js";

export type NextAddressSimulationActions = {
  armScenario?: (
    scenario: IntegrationSimulationScenario,
  ) => Promise<ArmIntegrationSimulationResponse>;
};

export type NextAddressSimulationWidgetOptions = {
  mount: HTMLElement | string;
  integration?: Pick<
    NextAddressIntegrationHandle,
    "canArmSimulationScenario" | "armSimulationScenario"
  >;
  actions?: NextAddressSimulationActions;
  injectStyles?: boolean;
  /** Shared simulation event timeline — pass to {@link loggedFetch} via `eventLog`. */
  eventLog?: SimulationEventLog;
  maxEvents?: number;
  /** Whether scenario controls are visible. Default false (collapsed). */
  defaultExpanded?: boolean;
};

export type NextAddressSimulationWidgetHandle = {
  getEventLog(): SimulationEventLog;
  isExpanded(): boolean;
  setExpanded(expanded: boolean): void;
  toggleExpanded(): void;
  clearEvents(): void;
  destroy(): void;
};

function resolveMount(mount: HTMLElement | string): HTMLElement {
  if (typeof mount !== "string") return mount;
  const el = document.querySelector<HTMLElement>(mount);
  if (!el) {
    throw new Error(`NextAddress simulation widget mount not found: ${mount}`);
  }
  return el;
}

function formatResult(result: ArmIntegrationSimulationResponse): string {
  if (result.status === "applied") {
    return `${result.message} Hold until ${new Date(result.hold.pausedUntil).toLocaleString()}.`;
  }
  const hint = result.hint || scenarioArmHint(result.scenario);
  return `${result.message} ${hint}`;
}

/**
 * Optional dev/test panel with buttons for integration failure scenarios.
 */
export function createNextAddressSimulationWidget(
  options: NextAddressSimulationWidgetOptions,
): NextAddressSimulationWidgetHandle {
  if (typeof document === "undefined") {
    throw new Error("createNextAddressSimulationWidget requires a browser DOM");
  }

  if (options.injectStyles !== false) {
    injectWidgetStyles();
  }

  const container = resolveMount(options.mount);
  container.classList.add("na-widget-host", "na-simulation-host");
  const eventLog = options.eventLog ?? new SimulationEventLog();

  let busy = false;
  let statusMessage: string | null = null;
  let statusError: string | null = null;
  let expanded = options.defaultExpanded ?? false;

  const canArmScenario = () =>
    options.integration?.canArmSimulationScenario() ??
    typeof options.actions?.armScenario === "function";

  function paint(): void {
    let events = eventLog.getEvents();
    if (options.maxEvents != null && options.maxEvents > 0) {
      events = events.slice(0, options.maxEvents);
    }
    renderSimulationWidget(container, {
      busy,
      statusMessage,
      statusError,
      expanded,
      events,
      canArmScenario: canArmScenario(),
      onToggleExpanded: () => {
        expanded = !expanded;
        paint();
      },
      onClearEvents: () => eventLog.clear(),
      onArmScenario: (scenario) => void runScenario(scenario),
    });
  }

  async function runScenario(scenario: IntegrationSimulationScenario): Promise<void> {
    if (busy || !canArmScenario()) return;
    busy = true;
    statusMessage = null;
    statusError = null;
    paint();
    try {
      const result =
        (await options.integration?.armSimulationScenario(scenario)) ??
        (await options.actions?.armScenario?.(scenario));
      if (!result) {
        statusError = "Simulation is not configured.";
        eventLog.recordFailed(scenario, statusError);
        return;
      }
      eventLog.recordArmResult(result);
      statusMessage = formatResult(result);
    } catch (e) {
      statusError = e instanceof Error ? e.message : "Simulation failed.";
      eventLog.recordFailed(scenario, statusError);
    } finally {
      busy = false;
      paint();
    }
  }

  const unsubscribe = eventLog.subscribe(paint);
  paint();

  return {
    getEventLog: () => eventLog,
    isExpanded: () => expanded,
    setExpanded(next) {
      expanded = next;
      paint();
    },
    toggleExpanded: () => {
      expanded = !expanded;
      paint();
    },
    clearEvents: () => eventLog.clear(),
    destroy() {
      unsubscribe();
      container.replaceChildren();
      container.classList.remove("na-widget-host", "na-simulation-host");
    },
  };
}
