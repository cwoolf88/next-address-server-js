/** Dev/test scenarios for address updates and NextAddress connection flows. */
export const INTEGRATION_SIMULATION_SCENARIOS = [
  "security_hold",
  "invalid_address",
  "invalid_address_format",
  "required_address_fields_missing",
  "sync_failure_merchant",
  "sync_failure_nextaddress",
  "network_error",
  "server_unreachable",
  "connection_fetch_failure",
] as const;

export type IntegrationSimulationScenario = (typeof INTEGRATION_SIMULATION_SCENARIOS)[number];

export type IntegrationSimulationCategory = "security" | "validation" | "sync" | "connection";

export function isIntegrationSimulationScenario(
  value: unknown,
): value is IntegrationSimulationScenario {
  return (
    typeof value === "string" &&
    (INTEGRATION_SIMULATION_SCENARIOS as readonly string[]).includes(value)
  );
}

export function scenarioCategory(
  scenario: IntegrationSimulationScenario,
): IntegrationSimulationCategory {
  switch (scenario) {
    case "security_hold":
      return "security";
    case "invalid_address":
    case "invalid_address_format":
    case "required_address_fields_missing":
      return "validation";
    case "sync_failure_merchant":
    case "sync_failure_nextaddress":
      return "sync";
    default:
      return "connection";
  }
}

export const SCENARIO_CATEGORY_ORDER: IntegrationSimulationCategory[] = [
  "security",
  "validation",
  "sync",
  "connection",
];

export const SCENARIO_CATEGORY_LABELS: Record<IntegrationSimulationCategory, string> = {
  security: "Security",
  validation: "Address validation",
  sync: "Sync failures",
  connection: "Connection & network",
};

export function scenariosForCategory(
  category: IntegrationSimulationCategory,
): IntegrationSimulationScenario[] {
  return INTEGRATION_SIMULATION_SCENARIOS.filter((s) => scenarioCategory(s) === category);
}

export function scenarioLabel(scenario: IntegrationSimulationScenario): string {
  switch (scenario) {
    case "security_hold":
      return "24-hour security hold";
    case "invalid_address":
      return "Invalid address";
    case "invalid_address_format":
      return "Invalid address format";
    case "required_address_fields_missing":
      return "Required fields missing";
    case "sync_failure_merchant":
      return "Merchant sync failure";
    case "sync_failure_nextaddress":
      return "NextAddress push failure";
    case "network_error":
      return "Network error";
    case "server_unreachable":
      return "Server not reachable";
    case "connection_fetch_failure":
      return "Connection info unavailable";
  }
}

export function scenarioDescription(scenario: IntegrationSimulationScenario): string {
  switch (scenario) {
    case "security_hold":
      return "Pause address changes for 24 hours and require Clerk email verification.";
    case "invalid_address":
      return "NextAddress rejects the address as undeliverable or unknown.";
    case "invalid_address_format":
      return "NextAddress rejects the payload because fields fail format rules.";
    case "required_address_fields_missing":
      return "Required address properties are null, undefined, or empty.";
    case "sync_failure_merchant":
      return "Merchant → NextAddress PATCH fails on the next save.";
    case "sync_failure_nextaddress":
      return "NextAddress → merchant webhook push fails on the next outbound sync.";
    case "network_error":
      return "Simulate a transport timeout or dropped connection.";
    case "server_unreachable":
      return "Simulate NextAddress returning HTTP 503 or being offline.";
    case "connection_fetch_failure":
      return "Loading connection URLs from your backend fails on the next refresh.";
  }
}

export function scenarioArmHint(scenario: IntegrationSimulationScenario): string {
  switch (scenario) {
    case "security_hold":
      return "Applied immediately on primary.";
    case "invalid_address":
    case "invalid_address_format":
    case "required_address_fields_missing":
    case "sync_failure_merchant":
    case "network_error":
    case "server_unreachable":
      return "Save contact info in your app to trigger.";
    case "sync_failure_nextaddress":
      return "Push an address from NextAddress to your app to trigger.";
    case "connection_fetch_failure":
      return "Refresh the NextAddress widget or reload connection info to trigger.";
  }
}

/** Scenarios handled on the tenant backend (not forwarded to primary). */
export function isTenantLocalSimulationScenario(
  scenario: IntegrationSimulationScenario,
): boolean {
  return (
    scenario === "network_error" ||
    scenario === "connection_fetch_failure"
  );
}
