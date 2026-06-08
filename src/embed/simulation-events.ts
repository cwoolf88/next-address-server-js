import type { ArmIntegrationSimulationResponse } from "../types.js";
import { scenarioLabel } from "../simulation-scenarios.js";
import type { IntegrationSimulationScenario } from "./types.js";

export type SimulationEventPhase = "armed" | "applied" | "consumed" | "triggered" | "failed";

export type SimulationEventContext =
  | "tenant"
  | "primary"
  | "contact_push"
  | "connection_fetch"
  | "primary_patch"
  | "primary_push";

export type SimulationEvent = {
  id: string;
  scenario: IntegrationSimulationScenario;
  phase: SimulationEventPhase;
  at: string;
  message?: string;
  hint?: string;
  context?: SimulationEventContext;
  httpStatus?: number;
};

export const SIMULATION_EVENT_PHASE_LABELS: Record<SimulationEventPhase, string> = {
  armed: "Armed",
  applied: "Applied",
  consumed: "Consumed",
  triggered: "Triggered",
  failed: "Failed",
};

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sim-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function simulationEventPhaseLabel(phase: SimulationEventPhase): string {
  return SIMULATION_EVENT_PHASE_LABELS[phase];
}

export function isSimulationEvent(value: unknown): value is SimulationEvent {
  if (!value || typeof value !== "object") return false;
  const row = value as SimulationEvent;
  return (
    typeof row.id === "string" &&
    typeof row.scenario === "string" &&
    typeof row.phase === "string" &&
    typeof row.at === "string"
  );
}

export function readSimulationEventsField(
  body: unknown,
  field = "simulationEvents",
): SimulationEvent[] {
  if (!body || typeof body !== "object") return [];
  const value = (body as Record<string, unknown>)[field];
  if (!Array.isArray(value)) return [];
  return value.filter(isSimulationEvent);
}

export function createSimulationEvent(input: {
  scenario: IntegrationSimulationScenario;
  phase: SimulationEventPhase;
  message?: string;
  hint?: string;
  context?: SimulationEventContext;
  httpStatus?: number;
  at?: string;
  id?: string;
}): SimulationEvent {
  return {
    id: input.id ?? newId(),
    scenario: input.scenario,
    phase: input.phase,
    at: input.at ?? new Date().toISOString(),
    message: input.message,
    hint: input.hint,
    context: input.context,
    httpStatus: input.httpStatus,
  };
}

export function simulationEventsFromArmResponse(
  result: ArmIntegrationSimulationResponse,
  context: SimulationEventContext = "primary",
): SimulationEvent[] {
  if (result.status === "applied") {
    return [
      createSimulationEvent({
        scenario: result.scenario,
        phase: "applied",
        message: result.message,
        context,
      }),
    ];
  }
  return [
    createSimulationEvent({
      scenario: result.scenario,
      phase: "armed",
      message: result.message,
      hint: result.hint,
      context,
    }),
  ];
}

export function simulationEventsFromConsume(
  scenario: IntegrationSimulationScenario,
  context: SimulationEventContext,
  message: string,
  httpStatus?: number,
): SimulationEvent[] {
  return [
    createSimulationEvent({
      scenario,
      phase: "consumed",
      context,
      message: "Scenario consumed — waiting for downstream effect.",
    }),
    createSimulationEvent({
      scenario,
      phase: "triggered",
      context,
      message,
      httpStatus,
    }),
  ];
}

export class SimulationEventLog {
  private events: SimulationEvent[] = [];
  private listeners = new Set<() => void>();

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  getEvents(): SimulationEvent[] {
    return this.events.map((event) => ({ ...event }));
  }

  clear(): void {
    this.events = [];
    this.notify();
  }

  record(event: SimulationEvent): void {
    this.events.unshift(event);
    this.notify();
  }

  append(events: SimulationEvent[]): void {
    if (!events.length) return;
    this.events = [...events, ...this.events];
    this.notify();
  }

  appendFromBody(body: unknown, field = "simulationEvents"): void {
    this.append(readSimulationEventsField(body, field));
  }

  recordArmResult(
    result: ArmIntegrationSimulationResponse,
    context: SimulationEventContext = "primary",
  ): void {
    this.append(simulationEventsFromArmResponse(result, context));
  }

  recordFailed(
    scenario: IntegrationSimulationScenario,
    message: string,
    context?: SimulationEventContext,
  ): void {
    this.record(
      createSimulationEvent({
        scenario,
        phase: "failed",
        message,
        context,
      }),
    );
  }

  recordConsume(
    scenario: IntegrationSimulationScenario,
    context: SimulationEventContext,
    message: string,
    httpStatus?: number,
  ): void {
    this.append(simulationEventsFromConsume(scenario, context, message, httpStatus));
  }

  formatSummary(event: SimulationEvent): string {
    const label = scenarioLabel(event.scenario);
    const phase = simulationEventPhaseLabel(event.phase);
    const parts = [phase, label];
    if (event.context) parts.push(`(${event.context.replace(/_/g, " ")})`);
    if (event.message) parts.push(`— ${event.message}`);
    return parts.join(" ");
  }
}
