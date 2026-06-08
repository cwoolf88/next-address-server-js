import {
  NetworkActivityLog,
  parseNetworkBody,
  redactNetworkHeaders,
  type NetworkActivityExchange,
} from "./network-activity.js";
import { SimulationEventLog, readSimulationEventsField } from "./simulation-events.js";

export type LoggedFetchOptions = {
  label: string;
  log: NetworkActivityLog;
  /** Read server-side exchanges nested in JSON response bodies. Default `networkActivity`. */
  networkActivityField?: string;
  /** Optional simulation timeline fed by nested `simulationEvents` in JSON bodies. */
  eventLog?: SimulationEventLog;
  /** Field name for nested simulation events. Default `simulationEvents`. */
  simulationEventsField?: string;
};

function readNetworkActivityField(
  body: unknown,
  field: string,
): NetworkActivityExchange[] | undefined {
  if (!body || typeof body !== "object") return undefined;
  const value = (body as Record<string, unknown>)[field];
  if (!Array.isArray(value)) return undefined;
  return value as NetworkActivityExchange[];
}

/**
 * Wraps `fetch` and records request/response pairs into a {@link NetworkActivityLog}.
 */
export async function loggedFetch(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  options: LoggedFetchOptions,
): Promise<Response> {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const method = (init?.method ?? "GET").toUpperCase();
  const field = options.networkActivityField ?? "networkActivity";
  const simulationField = options.simulationEventsField ?? "simulationEvents";

  let requestBody: unknown;
  if (typeof init?.body === "string") {
    requestBody = parseNetworkBody(init.body);
  }

  const id = options.log.begin({
    label: options.label,
    request: {
      method,
      url,
      headers: redactNetworkHeaders(init?.headers),
      body: requestBody,
    },
  });

  try {
    const res = await fetch(input, init);
    const text = await res.text();
    const responseBody = parseNetworkBody(text);
    const children = readNetworkActivityField(responseBody, field);
    let displayBody: unknown = responseBody;
    if (
      children?.length &&
      responseBody &&
      typeof responseBody === "object" &&
      !Array.isArray(responseBody)
    ) {
      const { [field]: _nested, ...rest } = responseBody as Record<string, unknown>;
      displayBody = rest;
    }

    options.log.complete(
      id,
      {
        status: res.status,
        statusText: res.statusText,
        headers: redactNetworkHeaders(
          Object.fromEntries(res.headers.entries()) as Record<string, string>,
        ),
        body: displayBody,
      },
      children,
    );

    if (options.eventLog) {
      options.eventLog.append(readSimulationEventsField(responseBody, simulationField));
    }

    return new Response(text, {
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network request failed";
    options.log.fail(id, message);
    throw e;
  }
}
