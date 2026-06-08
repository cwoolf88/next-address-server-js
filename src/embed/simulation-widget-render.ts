import { appendDevWidgetChevron } from "./dev-widget-helpers.js";
import {
  simulationEventPhaseLabel,
  type SimulationEvent,
} from "./simulation-events.js";
import {
  SCENARIO_CATEGORY_LABELS,
  SCENARIO_CATEGORY_ORDER,
  scenarioDescription,
  scenarioLabel,
  scenariosForCategory,
} from "./simulation-copy.js";
import type { IntegrationSimulationScenario } from "./types.js";

export type SimulationWidgetView = {
  busy: boolean;
  statusMessage: string | null;
  statusError: string | null;
  canArmScenario: boolean;
  expanded: boolean;
  events: SimulationEvent[];
  onToggleExpanded: () => void;
  onClearEvents: () => void;
  onArmScenario: (scenario: IntegrationSimulationScenario) => void;
};

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function scenarioButton(
  scenario: IntegrationSimulationScenario,
  busy: boolean,
  enabled: boolean,
  onArm: (scenario: IntegrationSimulationScenario) => void,
): HTMLButtonElement {
  const btn = el(
    "button",
    "na-simulation__btn na-simulation__btn--scenario",
    scenarioLabel(scenario),
  );
  btn.type = "button";
  btn.disabled = busy || !enabled;
  btn.title = scenarioDescription(scenario);
  btn.setAttribute("aria-label", `${scenarioLabel(scenario)}. ${scenarioDescription(scenario)}`);
  btn.addEventListener("click", () => onArm(scenario));
  return btn;
}

function phaseClass(phase: SimulationEvent["phase"]): string {
  switch (phase) {
    case "armed":
      return "na-simulation-events__phase na-simulation-events__phase--armed";
    case "applied":
      return "na-simulation-events__phase na-simulation-events__phase--applied";
    case "consumed":
      return "na-simulation-events__phase na-simulation-events__phase--consumed";
    case "triggered":
      return "na-simulation-events__phase na-simulation-events__phase--triggered";
    default:
      return "na-simulation-events__phase na-simulation-events__phase--failed";
  }
}

function formatEventTime(at: string): string {
  try {
    return new Date(at).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return at;
  }
}

function renderSimulationEvent(event: SimulationEvent): HTMLElement {
  const article = el("article", "na-simulation-events__item");
  const head = el("div", "na-simulation-events__head");

  head.appendChild(el("span", phaseClass(event.phase), simulationEventPhaseLabel(event.phase)));
  head.appendChild(el("span", "na-simulation-events__scenario", scenarioLabel(event.scenario)));

  if (event.context) {
    head.appendChild(
      el("span", "na-simulation-events__context", event.context.replace(/_/g, " ")),
    );
  }
  if (event.httpStatus != null) {
    head.appendChild(
      el("span", "na-simulation-events__status", `HTTP ${event.httpStatus}`),
    );
  }
  head.appendChild(el("time", "na-simulation-events__time", formatEventTime(event.at)));
  article.appendChild(head);

  if (event.message) {
    article.appendChild(el("p", "na-simulation-events__message", event.message));
  }
  if (event.hint) {
    article.appendChild(el("p", "na-simulation-events__hint", event.hint));
  }

  return article;
}

export function renderSimulationWidget(host: HTMLElement, view: SimulationWidgetView): void {
  const section = el("section", "na-simulation na-widget na-dev-widget");
  if (!view.expanded) {
    section.classList.add("na-dev-widget--collapsed");
  }
  section.setAttribute("aria-label", "NextAddress integration simulations");

  const header = el("div", "na-dev-widget__header");
  const toggleBtn = el("button", "na-dev-widget__toggle", "");
  toggleBtn.type = "button";
  toggleBtn.setAttribute("aria-expanded", view.expanded ? "true" : "false");
  toggleBtn.setAttribute(
    "aria-label",
    view.expanded ? "Collapse integration simulations" : "Expand integration simulations",
  );
  toggleBtn.addEventListener("click", view.onToggleExpanded);

  const toggleCopy = el("span", "na-dev-widget__toggle-copy");
  toggleCopy.appendChild(el("h3", "na-dev-widget__title", "Integration simulations"));
  toggleCopy.appendChild(el("span", "na-dev-widget__badge na-dev-widget__badge--amber", "Dev only"));
  if (view.events.length > 0) {
    const countLabel =
      view.events.length === 1 ? "1 event" : `${view.events.length} events`;
    toggleCopy.appendChild(el("span", "na-dev-widget__count", countLabel));
  }
  toggleBtn.appendChild(toggleCopy);
  appendDevWidgetChevron(toggleBtn);
  header.appendChild(toggleBtn);
  section.appendChild(header);

  const body = el("div", "na-dev-widget__body");
  if (!view.expanded) {
    body.hidden = true;
  }

  body.appendChild(
    el(
      "p",
      "na-dev-widget__subtitle",
      "Arm common failure scenarios, then save contact info or refresh the connection widget to trigger them.",
    ),
  );

  const actions = el("div", "na-simulation__actions");
  for (const category of SCENARIO_CATEGORY_ORDER) {
    const scenarios = scenariosForCategory(category);
    const group = el("div", "na-simulation__group");
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", SCENARIO_CATEGORY_LABELS[category]);
    group.appendChild(el("p", "na-simulation__legend", SCENARIO_CATEGORY_LABELS[category]));

    const grid = el("div", "na-simulation__grid");
    for (const scenario of scenarios) {
      grid.appendChild(scenarioButton(scenario, view.busy, view.canArmScenario, view.onArmScenario));
    }
    group.appendChild(grid);
    actions.appendChild(group);
  }
  body.appendChild(actions);

  if (!view.canArmScenario) {
    body.appendChild(
      el(
        "p",
        "na-simulation__hint",
        "Wire simulation.armScenario on your integration (tenant API → NextAddressClient.armIntegrationSimulation).",
      ),
    );
  }

  if (view.busy) {
    const loading = el("p", "na-simulation__status na-simulation__status--loading", "Arming scenario…");
    loading.setAttribute("role", "status");
    loading.setAttribute("aria-live", "polite");
    body.appendChild(loading);
  } else if (view.statusMessage) {
    const ok = el("p", "na-simulation__status na-simulation__status--ok", view.statusMessage);
    ok.setAttribute("role", "status");
    body.appendChild(ok);
  } else if (view.statusError) {
    const err = el("p", "na-simulation__status na-simulation__status--error", view.statusError);
    err.setAttribute("role", "alert");
    body.appendChild(err);
  }

  const eventsToolbar = el("div", "na-simulation-events__toolbar");
  eventsToolbar.appendChild(el("p", "na-simulation-events__title", "Simulation events"));
  const clearBtn = el("button", "na-simulation-events__clear", "Clear events");
  clearBtn.type = "button";
  clearBtn.addEventListener("click", view.onClearEvents);
  eventsToolbar.appendChild(clearBtn);
  body.appendChild(eventsToolbar);

  const eventsLog = el("div", "na-simulation-events");
  eventsLog.setAttribute("role", "log");
  eventsLog.setAttribute("aria-live", "polite");
  eventsLog.setAttribute("aria-relevant", "additions");

  if (view.events.length === 0) {
    eventsLog.appendChild(
      el(
        "p",
        "na-simulation-events__empty",
        "No simulation events yet. Arm a scenario or trigger a failure to populate the timeline.",
      ),
    );
  } else {
    for (const event of view.events) {
      eventsLog.appendChild(renderSimulationEvent(event));
    }
  }
  body.appendChild(eventsLog);

  section.appendChild(body);
  host.replaceChildren(section);
}
