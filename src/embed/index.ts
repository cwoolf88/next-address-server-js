export {
  contactSyncStateFromError,
  contactSyncStateFromPrimaryBatch,
  contactSyncStateFromSaveResult,
  getPrimaryErrorMessage,
  isPrimaryClientError,
  type ContactSyncDisplayState,
} from "../sync.js";
export { WIDGET_CSS, injectWidgetStyles } from "./widget-styles.js";
export {
  connectionStatusTooltip,
  connectionSubtitle,
  DEFAULT_PRIMARY_SETTINGS_PATH,
  disconnectButtonLabel,
  resolvePrimarySettingsUrl,
  sessionPollRefreshLabel,
  settingsButtonLabel,
} from "./connection-copy.js";
export {
  canConnectAccount,
  canDisconnect,
  canOpenSettings,
  createNextAddressIntegration,
  getSettingsUrl,
  shouldShowSessionPollRefresh,
} from "./integration.js";
export { createNextAddressWidget } from "./widget.js";
export { createNextAddressSimulationWidget } from "./simulation-widget.js";
export { createNextAddressNetworkActivityWidget } from "./network-activity-widget.js";
export type {
  NextAddressNetworkActivityWidgetHandle,
  NextAddressNetworkActivityWidgetOptions,
} from "./network-activity-widget.js";
export { loggedFetch } from "./logged-fetch.js";
export {
  SimulationEventLog,
  SIMULATION_EVENT_PHASE_LABELS,
  createSimulationEvent,
  isSimulationEvent,
  readSimulationEventsField,
  simulationEventPhaseLabel,
  simulationEventsFromArmResponse,
  simulationEventsFromConsume,
} from "./simulation-events.js";
export type {
  SimulationEvent,
  SimulationEventContext,
  SimulationEventPhase,
} from "./simulation-events.js";
export {
  NetworkActivityLog,
  formatNetworkJson,
  parseNetworkBody,
  redactNetworkHeaders,
} from "./network-activity.js";
export type {
  NetworkActivityExchange,
  NetworkActivityRequest,
  NetworkActivityResponse,
} from "./network-activity.js";
export type {
  NextAddressSimulationActions,
  NextAddressSimulationWidgetHandle,
  NextAddressSimulationWidgetOptions,
} from "./simulation-widget.js";
export {
  SCENARIO_CATEGORY_LABELS,
  SCENARIO_CATEGORY_ORDER,
  scenarioArmHint,
  scenarioDescription,
  scenarioLabel,
  scenariosForCategory,
} from "./simulation-copy.js";
export {
  WIDGET_THEME_PRESETS,
  applyWidgetPalette,
  clearWidgetPalette,
  resolveWidgetPalette,
} from "./themes.js";
export type {
  WidgetFontPalette,
  WidgetPalette,
  WidgetTheme,
  WidgetThemeName,
} from "./themes.js";
export {
  invalidatePrimarySessionCache,
  probePrimaryClerkSession,
  type PrimarySession,
} from "./primary-session.js";
export {
  pollPrimaryClerkSessionUntil,
  type SessionPollOptions,
} from "./session-poll.js";
export {
  NEXTADDRESS_BRIDGE_COMPLETE,
  isPrimarySignInUrl,
  openPrimarySettingsTab,
  openPrimarySignInPopup,
  runConnectAccountFlow,
  runPrimaryBridge,
  runPrimaryBridgeInHiddenFrame,
} from "./primary-bridge.js";
export type { PrimaryBridgeRunner } from "./primary-bridge.js";
export type {
  AddressChangeHoldStatus,
  AddressUpdateFailureSource,
  ArmIntegrationSimulationResponse,
  IntegrationSimulationScenario,
  SimulateFailedAddressUpdateResponse,
  NextAddressIntegrationHandle,
  NextAddressIntegrationOptions,
  NextAddressIntegrationState,
  SessionPollState,
  NextAddressWidgetHandle,
  NextAddressWidgetOptions,
  TenantConnectionInfo,
  WidgetConnectionView,
} from "./types.js";
