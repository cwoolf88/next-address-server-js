import { appendDevWidgetChevron } from "./dev-widget-helpers.js";
import { formatNetworkJson } from "./network-activity.js";
import type { NetworkActivityExchange } from "./network-activity.js";

export type NetworkActivityWidgetView = {
  exchanges: NetworkActivityExchange[];
  expanded: boolean;
  onToggleExpanded: () => void;
  onClear: () => void;
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

function statusClass(status: number | undefined, error?: string): string {
  if (error) return "na-network-console__status na-network-console__status--error";
  if (status == null) return "na-network-console__status";
  if (status >= 200 && status < 300) return "na-network-console__status na-network-console__status--ok";
  if (status >= 400) return "na-network-console__status na-network-console__status--error";
  return "na-network-console__status na-network-console__status--warn";
}

function renderBlock(
  title: string,
  className: string,
  content: string,
): HTMLDivElement {
  const block = el("div", "na-network-console__block");
  block.appendChild(el("p", "na-network-console__block-title", title));
  const pre = el("pre", className);
  pre.textContent = content || "(empty)";
  block.appendChild(pre);
  return block;
}

function renderExchange(
  exchange: NetworkActivityExchange,
  depth = 0,
): HTMLElement {
  const wrap = el("article", "na-network-console__exchange");
  if (depth > 0) {
    wrap.classList.add("na-network-console__exchange--nested");
    wrap.style.setProperty("--na-network-depth", String(depth));
  }

  const head = el("div", "na-network-console__exchange-head");
  const meta = el("div", "na-network-console__meta");

  const label = el("span", "na-network-console__label", exchange.label);
  meta.appendChild(label);

  const verb = el(
    "span",
    "na-network-console__verb",
    `${exchange.request.method} ${exchange.request.url}`,
  );
  meta.appendChild(verb);

  if (exchange.response) {
    const status = el(
      "span",
      statusClass(exchange.response.status),
      `${exchange.response.status}${exchange.response.statusText ? ` ${exchange.response.statusText}` : ""}`,
    );
    meta.appendChild(status);
  } else if (exchange.error) {
    meta.appendChild(el("span", statusClass(undefined, exchange.error), "Failed"));
  }

  if (exchange.durationMs != null) {
    meta.appendChild(el("span", "na-network-console__timing", `${exchange.durationMs}ms`));
  }

  head.appendChild(meta);
  wrap.appendChild(head);

  const body = el("div", "na-network-console__exchange-body");
  body.appendChild(
    renderBlock(
      "Request",
      "na-network-console__pre na-network-console__pre--request",
      [
        formatNetworkJson(exchange.request.headers),
        formatNetworkJson(exchange.request.body),
      ]
        .filter(Boolean)
        .join("\n\n"),
    ),
  );

  if (exchange.response) {
    body.appendChild(
      renderBlock(
        "Response",
        "na-network-console__pre na-network-console__pre--response",
        [
          formatNetworkJson(exchange.response.headers),
          formatNetworkJson(exchange.response.body),
        ]
          .filter(Boolean)
          .join("\n\n"),
      ),
    );
  } else if (exchange.error) {
    body.appendChild(
      renderBlock("Error", "na-network-console__pre na-network-console__pre--error", exchange.error),
    );
  }

  wrap.appendChild(body);

  if (exchange.children?.length) {
    const nested = el("div", "na-network-console__children");
    for (const child of exchange.children) {
      nested.appendChild(renderExchange(child, depth + 1));
    }
    wrap.appendChild(nested);
  }

  return wrap;
}

export function renderNetworkActivityWidget(
  host: HTMLElement,
  view: NetworkActivityWidgetView,
): void {
  const section = el("section", "na-network-activity na-widget na-dev-widget");
  if (!view.expanded) {
    section.classList.add("na-dev-widget--collapsed");
  }
  section.setAttribute("aria-label", "NextAddress network activity");

  const header = el("div", "na-dev-widget__header");
  const toggleBtn = el("button", "na-dev-widget__toggle", "");
  toggleBtn.type = "button";
  toggleBtn.setAttribute("aria-expanded", view.expanded ? "true" : "false");
  toggleBtn.setAttribute(
    "aria-label",
    view.expanded ? "Collapse network activity" : "Expand network activity",
  );
  toggleBtn.addEventListener("click", view.onToggleExpanded);

  const toggleCopy = el("span", "na-dev-widget__toggle-copy");
  toggleCopy.appendChild(el("h3", "na-dev-widget__title", "Network activity"));
  toggleCopy.appendChild(el("span", "na-dev-widget__badge na-dev-widget__badge--sky", "Dev only"));
  if (view.exchanges.length > 0) {
    const countLabel =
      view.exchanges.length === 1 ? "1 exchange" : `${view.exchanges.length} exchanges`;
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
      "Integration requests and responses, grouped with downstream primary API calls.",
    ),
  );

  const toolbar = el("div", "na-network-activity__toolbar");
  const clearBtn = el("button", "na-network-activity__clear", "Clear log");
  clearBtn.type = "button";
  clearBtn.addEventListener("click", view.onClear);
  toolbar.appendChild(clearBtn);
  body.appendChild(toolbar);

  const consoleEl = el("div", "na-network-console");
  consoleEl.setAttribute("role", "log");
  consoleEl.setAttribute("aria-live", "polite");
  consoleEl.setAttribute("aria-relevant", "additions");

  if (view.exchanges.length === 0) {
    consoleEl.appendChild(
      el(
        "p",
        "na-network-console__empty",
        "No network activity yet. Connect, save contact info, or run a simulation to populate the log.",
      ),
    );
  } else {
    for (const exchange of view.exchanges) {
      consoleEl.appendChild(renderExchange(exchange));
    }
  }

  body.appendChild(consoleEl);
  section.appendChild(body);
  host.replaceChildren(section);
}
