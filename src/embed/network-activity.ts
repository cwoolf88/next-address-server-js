export type NetworkActivityRequest = {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
};

export type NetworkActivityResponse = {
  status: number;
  statusText?: string;
  headers?: Record<string, string>;
  body?: unknown;
};

/** One request/response pair, optionally with nested downstream calls. */
export type NetworkActivityExchange = {
  id: string;
  label: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  request: NetworkActivityRequest;
  response?: NetworkActivityResponse;
  error?: string;
  children?: NetworkActivityExchange[];
};

const SENSITIVE_HEADER = /^(authorization|cookie|x-api-key)$/i;

export function redactNetworkHeaders(
  headers?: HeadersInit | Record<string, string>,
): Record<string, string> | undefined {
  if (!headers) return undefined;
  const out: Record<string, string> = {};
  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      out[key] = SENSITIVE_HEADER.test(key) ? "••••••••" : value;
    });
    return out;
  }
  for (const [key, value] of Object.entries(headers)) {
    out[key] = SENSITIVE_HEADER.test(key) ? "••••••••" : value;
  }
  return out;
}

export function parseNetworkBody(raw: string): unknown {
  if (!raw.trim()) return undefined;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

export function formatNetworkJson(value: unknown): string {
  if (value === undefined) return "";
  if (typeof value === "string") {
    try {
      return JSON.stringify(JSON.parse(value) as unknown, null, 2);
    } catch {
      return value;
    }
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `net-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export type BeginNetworkExchangeInput = {
  id?: string;
  label: string;
  request: NetworkActivityRequest;
};

export class NetworkActivityLog {
  private exchanges: NetworkActivityExchange[] = [];
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

  getExchanges(): NetworkActivityExchange[] {
    return this.exchanges.map((e) => ({
      ...e,
      children: e.children ? [...e.children] : undefined,
    }));
  }

  clear(): void {
    this.exchanges = [];
    this.notify();
  }

  begin(input: BeginNetworkExchangeInput): string {
    const id = input.id ?? newId();
    this.exchanges.unshift({
      id,
      label: input.label,
      startedAt: new Date().toISOString(),
      request: input.request,
      children: [],
    });
    this.notify();
    return id;
  }

  complete(
    id: string,
    response: NetworkActivityResponse,
    children?: NetworkActivityExchange[],
  ): void {
    const entry = this.exchanges.find((e) => e.id === id);
    if (!entry) return;
    const completedAt = new Date();
    entry.completedAt = completedAt.toISOString();
    entry.durationMs = Math.max(
      0,
      completedAt.getTime() - new Date(entry.startedAt).getTime(),
    );
    entry.response = response;
    if (children?.length) {
      entry.children = children;
    }
    this.notify();
  }

  fail(id: string, error: string, children?: NetworkActivityExchange[]): void {
    const entry = this.exchanges.find((e) => e.id === id);
    if (!entry) return;
    const completedAt = new Date();
    entry.completedAt = completedAt.toISOString();
    entry.durationMs = Math.max(
      0,
      completedAt.getTime() - new Date(entry.startedAt).getTime(),
    );
    entry.error = error;
    if (children?.length) {
      entry.children = children;
    }
    this.notify();
  }

  appendChildren(parentId: string, children: NetworkActivityExchange[]): void {
    const entry = this.exchanges.find((e) => e.id === parentId);
    if (!entry) return;
    entry.children = [...(entry.children ?? []), ...children];
    this.notify();
  }

  record(exchange: NetworkActivityExchange): void {
    this.exchanges.unshift(exchange);
    this.notify();
  }
}
