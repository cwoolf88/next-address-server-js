import type { ContactSyncDisplayState } from "../sync.js";
import type { WidgetConnectionView } from "./types.js";

export type ConnectionWidgetActions = {
  onSignIn: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onOpenSettings: () => void;
};

export type SyncWidgetActions = {
  onRetry?: () => void;
  retryDisabled?: boolean;
};

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function ghostLine(widthClass: string): HTMLDivElement {
  const line = el("div", `na-widget__ghost-line ${widthClass}`);
  line.setAttribute("aria-hidden", "true");
  return line;
}

function renderConnectionGhost(section: HTMLElement): void {
  const ghost = el("div", "na-widget__ghost");
  ghost.setAttribute("aria-hidden", "true");

  const header = el("div", "na-widget__ghost-header");
  const top = el("div", "na-widget__header-top");
  const copy = el("div", "na-widget__ghost-copy");
  copy.appendChild(ghostLine("na-widget__ghost-line--title"));
  copy.appendChild(ghostLine("na-widget__ghost-line--subtitle"));
  top.appendChild(copy);
  const headerActions = el("div", "na-widget__header-actions");
  const slot = el("div", "na-widget__link-status-slot");
  slot.appendChild(el("div", "na-widget__ghost-icon"));
  headerActions.appendChild(slot);
  headerActions.appendChild(el("div", "na-widget__ghost-icon"));
  top.appendChild(headerActions);
  header.appendChild(top);
  header.appendChild(el("div", "na-widget__ghost-pill"));
  ghost.appendChild(header);

  const actions = el("div", "na-widget__ghost-actions");
  actions.appendChild(el("div", "na-widget__ghost-btn"));
  ghost.appendChild(actions);

  section.appendChild(ghost);

  const sr = el("span", "na-widget__ghost-sr", "Loading NextAddress…");
  section.appendChild(sr);
}

function connectionSubtitle(view: WidgetConnectionView, tenantName: string): string {
  const app = tenantName || "your app";
  if (view.linked) {
    return `Contact updates from ${app} sync through your shared NextAddress profile.`;
  }
  if (view.signedIntoPrimary) {
    return `Link ${app} to keep your address and contact info in sync across partners.`;
  }
  return `One address profile for everywhere you shop—sign in to link ${app}.`;
}

function linkStatusTooltip(view: WidgetConnectionView, mockMode: boolean): string {
  if (view.statusLoading) {
    return "Checking link status with NextAddress…";
  }
  if (view.linked) {
    return mockMode
      ? "Linked (mock). Changes you save sync to your NextAddress profile."
      : "Linked. Changes you save in this app sync to your NextAddress profile.";
  }
  return mockMode
    ? "Not linked (mock). Connect to sync contact and address updates."
    : "Not linked. Connect to send contact and address updates to NextAddress.";
}

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
  return document.createElementNS("http://www.w3.org/2000/svg", tag);
}

function strokeIcon(attrs: Record<string, string>): SVGElement {
  const node = svgEl(attrs.tag as "path" | "circle" | "line");
  for (const [key, value] of Object.entries(attrs)) {
    if (key !== "tag") {
      node.setAttribute(key, value);
    }
  }
  node.setAttribute("fill", "none");
  node.setAttribute("stroke", "currentColor");
  node.setAttribute("stroke-width", "2");
  node.setAttribute("stroke-linecap", "round");
  node.setAttribute("stroke-linejoin", "round");
  return node;
}

/** Checkmark — color from parent (success when linked, muted when not). */
function appendCheckmarkIcon(svg: SVGSVGElement): void {
  const check = strokeIcon({
    tag: "path",
    d: "M20 6L9 17l-5-5",
  });
  check.setAttribute("stroke-width", "2");
  svg.append(check);
}

function appendSettingsGearIcon(svg: SVGSVGElement): void {
  const gear = strokeIcon({
    tag: "path",
    d: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z",
  });
  gear.setAttribute("stroke-width", "1.75");
  svg.append(gear);
  const hub = strokeIcon({
    tag: "circle",
    cx: "12",
    cy: "12",
    r: "3",
  });
  hub.setAttribute("stroke-width", "1.75");
  svg.append(hub);
}

function appendSettingsButton(
  container: HTMLElement,
  view: WidgetConnectionView,
  onOpenSettings: () => void
): void {
  const signedIn = view.signedIntoPrimary;
  const label = signedIn
    ? "Manage your addresses in NextAddress"
    : "Sign in to manage your addresses in NextAddress";
  const btn = el("button", "na-widget__settings-btn");
  btn.type = "button";
  btn.setAttribute("aria-label", label);
  btn.title = label;
  btn.disabled = !signedIn || view.statusLoading;

  const svg = createLinkStatusSvg(16);
  svg.setAttribute("class", "na-widget__settings-icon");
  appendSettingsGearIcon(svg);
  btn.appendChild(svg);
  btn.addEventListener("click", onOpenSettings);
  container.appendChild(btn);
}

const LOADING_RIPPLE_COUNT = 4;
const LOADING_RIPPLE_DUR_S = 4;

function rippleAnimate(
  attributeName: string,
  from: string,
  to: string,
  begin: string
): SVGAnimateElement {
  const anim = document.createElementNS("http://www.w3.org/2000/svg", "animate");
  anim.setAttribute("attributeName", attributeName);
  anim.setAttribute("from", from);
  anim.setAttribute("to", to);
  anim.setAttribute("dur", `${LOADING_RIPPLE_DUR_S}s`);
  anim.setAttribute("begin", begin);
  anim.setAttribute("repeatCount", "indefinite");
  return anim;
}

/** Low at birth → brighter mid-expand → fade to 0 at the clip edge. */
function rippleOpacityAnimate(begin: string): SVGAnimateElement {
  const anim = document.createElementNS("http://www.w3.org/2000/svg", "animate");
  anim.setAttribute("attributeName", "opacity");
  anim.setAttribute("values", "0.22;0.62;0");
  anim.setAttribute("keyTimes", "0;0.42;1");
  anim.setAttribute("dur", `${LOADING_RIPPLE_DUR_S}s`);
  anim.setAttribute("begin", begin);
  anim.setAttribute("repeatCount", "indefinite");
  return anim;
}

/** Concentric rings expanding from the icon center until clipped at the edge. */
function appendLoadingPulse(svg: SVGSVGElement): void {
  const clipId = `na-ripple-clip-${Math.random().toString(36).slice(2, 9)}`;
  const defs = svgEl("defs");
  const clipPath = svgEl("clipPath");
  clipPath.setAttribute("id", clipId);
  const clipCircle = svgEl("circle");
  clipCircle.setAttribute("cx", "12");
  clipCircle.setAttribute("cy", "12");
  clipCircle.setAttribute("r", "12");
  clipPath.appendChild(clipCircle);
  defs.appendChild(clipPath);
  svg.appendChild(defs);

  const ripples = svgEl("g");
  ripples.setAttribute("class", "na-widget__link-status-ripples");
  ripples.setAttribute("clip-path", `url(#${clipId})`);

  for (let i = 0; i < LOADING_RIPPLE_COUNT; i++) {
    const begin = `${((i * LOADING_RIPPLE_DUR_S) / LOADING_RIPPLE_COUNT).toFixed(2)}s`;
    const circle = svgEl("circle");
    circle.setAttribute("class", "na-widget__link-status-ripple");
    circle.setAttribute("cx", "12");
    circle.setAttribute("cy", "12");
    circle.setAttribute("r", "0.5");
    circle.appendChild(rippleAnimate("r", "0.5", "11.5", begin));
    circle.appendChild(rippleOpacityAnimate(begin));
    ripples.appendChild(circle);
  }
  svg.appendChild(ripples);

  const hub = svgEl("circle");
  hub.setAttribute("class", "na-widget__link-status-ripple-hub");
  hub.setAttribute("cx", "12");
  hub.setAttribute("cy", "12");
  hub.setAttribute("r", "1.25");
  svg.appendChild(hub);
}

function createLinkStatusSvg(sizePx: number): SVGSVGElement {
  const svg = svgEl("svg");
  svg.setAttribute("class", "na-widget__link-status-icon");
  svg.setAttribute("width", String(sizePx));
  svg.setAttribute("height", String(sizePx));
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  return svg;
}

function appendLinkStatusIcon(
  slot: HTMLElement,
  view: WidgetConnectionView,
  mockMode: boolean
): void {
  const linked = view.linked;
  const tooltip = linkStatusTooltip(view, mockMode);
  const status = el("span", "na-widget__link-status");
  status.tabIndex = 0;
  status.setAttribute("role", "status");
  status.setAttribute("data-na-tooltip", tooltip);
  status.setAttribute("aria-label", tooltip);

  const svg = createLinkStatusSvg(16);

  if (view.statusLoading) {
    status.classList.add("na-widget__link-status--loading");
    appendLoadingPulse(svg);
  } else {
    status.classList.add(linked ? "na-widget__link-status--linked" : "na-widget__link-status--unlinked");
    appendCheckmarkIcon(svg);
  }

  status.appendChild(svg);
  slot.replaceChildren(status);
}

export function renderConnectionSection(
  host: HTMLElement,
  view: WidgetConnectionView,
  tenantName: string,
  actions: ConnectionWidgetActions
): void {
  const section = el("section", "na-widget na-widget__connection");
  section.setAttribute("aria-label", "NextAddress");

  if (view.loading) {
    section.setAttribute("aria-busy", "true");
    renderConnectionGhost(section);
    host.replaceChildren(section);
    return;
  }
  section.removeAttribute("aria-busy");

  if (!view.info) {
    section.appendChild(
      el("p", "na-widget__error", view.error ?? "Tenant connection unavailable.")
    );
    host.replaceChildren(section);
    return;
  }

  const info = view.info;
  const header = el("div", "na-widget__header");
  const top = el("div", "na-widget__header-top");
  const copy = el("div", "na-widget__copy");
  copy.appendChild(el("h2", "na-widget__title", "NextAddress"));
  copy.appendChild(el("p", "na-widget__subtitle", connectionSubtitle(view, tenantName)));
  top.appendChild(copy);

  const linkSlot = el("div", "na-widget__link-status-slot");
  appendLinkStatusIcon(linkSlot, view, info.mockMode);
  const headerActions = el("div", "na-widget__header-actions");
  headerActions.appendChild(linkSlot);
  if (info.primaryBaseUrl && !info.mockMode) {
    appendSettingsButton(headerActions, view, actions.onOpenSettings);
  }
  top.appendChild(headerActions);
  header.appendChild(top);

  if (!info.mockMode && view.signedIntoPrimary) {
    const signInBadge = el("span", "na-widget__badge na-widget__badge--signed-in");
    signInBadge.textContent = view.primaryEmail
      ? `Signed in as ${view.primaryEmail}`
      : "Signed in";
    header.appendChild(signInBadge);
  }

  section.appendChild(header);

  if (view.error) {
    section.appendChild(el("p", "na-widget__error", view.error));
  }

  const actionsRow = el("div", "na-widget__actions");

  if (view.linked) {
    const btn = el("button", "na-widget__btn na-widget__btn--secondary", "Unlink account");
    btn.type = "button";
    btn.disabled = !info.disconnectUrl || (!view.signedIntoPrimary && !info.disconnectSignInUrl);
    if (!view.signedIntoPrimary && info.disconnectSignInUrl) {
      btn.textContent = "Sign in to unlink";
    }
    btn.addEventListener("click", actions.onDisconnect);
    actionsRow.appendChild(btn);
  } else if (view.signedIntoPrimary) {
    const btn = el("button", "na-widget__btn na-widget__btn--primary", "Link account");
    btn.type = "button";
    btn.disabled = !info.connectUrl || view.statusLoading;
    btn.addEventListener("click", actions.onConnect);
    actionsRow.appendChild(btn);
  } else {
    const btn = el("button", "na-widget__btn na-widget__btn--primary", "Sign in");
    btn.type = "button";
    btn.disabled = !info.connectSignInUrl || view.statusLoading;
    btn.addEventListener("click", actions.onSignIn);
    actionsRow.appendChild(btn);
    if (!info.connectSignInUrl) {
      const hint = el(
        "p",
        "na-widget__hint",
        "Set NEXT_ADDRESS_PRIMARY_BASE_URL to enable sign-in."
      );
      actionsRow.appendChild(hint);
    }
  }

  section.appendChild(actionsRow);
  host.replaceChildren(section);
}

export function renderSyncSection(
  host: HTMLElement,
  state: ContactSyncDisplayState,
  syncActions: SyncWidgetActions,
  connectionSection: HTMLElement | null
): void {
  const fragment = document.createDocumentFragment();
  if (connectionSection) fragment.appendChild(connectionSection);

  if (state.status === "idle") {
    host.replaceChildren(fragment);
    return;
  }

  const section = el("section", "na-widget__sync");
  section.setAttribute("aria-label", "NextAddress sync status");

  if (state.status === "syncing") {
    section.classList.add("na-widget__sync--syncing");
    section.setAttribute("role", "status");
    section.setAttribute("aria-live", "polite");
    section.appendChild(el("p", "na-widget__sync-title", "Syncing with NextAddress…"));
  } else if (state.status === "synced") {
    section.classList.add("na-widget__sync--synced");
    section.setAttribute("role", "status");
    section.appendChild(el("p", "na-widget__sync-title", "Synced with NextAddress"));
  } else if (state.status === "queued") {
    section.classList.add("na-widget__sync--queued");
    section.setAttribute("role", "status");
    section.appendChild(el("p", "na-widget__sync-title", "Sync pending"));
    section.appendChild(
      el(
        "p",
        undefined,
        "Your update is queued and will reach NextAddress on the next scheduled sync."
      )
    );
  } else {
    section.classList.add("na-widget__sync--failed");
    section.setAttribute("role", "alert");
    section.setAttribute("aria-live", "assertive");
    section.appendChild(el("p", "na-widget__sync-title", "Syncing failed"));
    section.appendChild(
      el(
        "p",
        undefined,
        state.httpStatus != null
          ? `NextAddress returned status ${state.httpStatus}.`
          : "We could not sync this contact update with NextAddress."
      )
    );
    if (state.retryable && syncActions.onRetry) {
      const row = el("div", "na-widget__sync-actions");
      const retry = el("button", "na-widget__retry", "Try again");
      retry.type = "button";
      retry.disabled = !!syncActions.retryDisabled;
      retry.addEventListener("click", syncActions.onRetry);
      row.appendChild(retry);
      section.appendChild(row);
    }
    const details = el("details", "na-widget__details");
    const summary = el("summary", "na-widget__details-summary", "Error details");
    details.appendChild(summary);
    details.appendChild(el("p", "na-widget__error-message", state.errorMessage));
    section.appendChild(details);
  }

  fragment.appendChild(section);
  host.replaceChildren(fragment);
}

export function renderWidget(
  host: HTMLElement,
  connection: WidgetConnectionView,
  tenantName: string,
  connectionActions: ConnectionWidgetActions,
  syncState: ContactSyncDisplayState | null,
  syncActions: SyncWidgetActions
): void {
  const connectionRoot = el("div");
  renderConnectionSection(connectionRoot, connection, tenantName, connectionActions);
  const connectionSection = connectionRoot.firstElementChild as HTMLElement | null;

  if (syncState == null) {
    host.replaceChildren(...(connectionSection ? [connectionSection] : []));
    return;
  }

  renderSyncSection(host, syncState, syncActions, connectionSection);
}
