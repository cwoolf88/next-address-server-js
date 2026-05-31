"use client";

import type { CSSProperties } from "react";
import type { ContactSyncDisplayState } from "../sync.js";

export type NextAddressSyncCardProps = {
  state: ContactSyncDisplayState;
  /** Called when the user clicks Try again after a failed sync. */
  onRetry?: () => void;
  /** Disables Try again while a retry is in flight. */
  retryDisabled?: boolean;
  className?: string;
  style?: CSSProperties;
};

const baseCard: CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  padding: "12px 14px",
  fontSize: "0.875rem",
  lineHeight: 1.45,
  background: "#fff",
};

const variants: Record<Exclude<ContactSyncDisplayState["status"], "idle">, CSSProperties> = {
  syncing: { borderColor: "#bfdbfe", background: "#eff6ff", color: "#1e3a8a" },
  synced: { borderColor: "#bbf7d0", background: "#f0fdf4", color: "#14532d" },
  queued: { borderColor: "#fde68a", background: "#fffbeb", color: "#78350f" },
  failed: { borderColor: "#fecaca", background: "#fef2f2", color: "#7f1d1d" },
};

export function NextAddressSyncCard({
  state,
  onRetry,
  retryDisabled = false,
  className,
  style,
}: NextAddressSyncCardProps) {
  if (state.status === "idle") return null;

  const cardStyle: CSSProperties = {
    ...baseCard,
    ...variants[state.status],
    ...style,
  };

  if (state.status === "syncing") {
    return (
      <div className={className} style={cardStyle} role="status" aria-live="polite">
        <p style={{ margin: "0 0 8px", fontWeight: 600 }}>Syncing with NextAddress…</p>
      </div>
    );
  }

  if (state.status === "synced") {
    return (
      <div className={className} style={cardStyle} role="status">
        <p style={{ margin: "0 0 8px", fontWeight: 600 }}>Synced with NextAddress</p>
      </div>
    );
  }

  if (state.status === "queued") {
    return (
      <div className={className} style={cardStyle} role="status">
        <p style={{ margin: "0 0 8px", fontWeight: 600 }}>Sync pending</p>
        <p style={{ margin: 0 }}>
          Your update is queued and will reach NextAddress on the next scheduled sync.
        </p>
      </div>
    );
  }

  return (
    <div className={className} style={cardStyle} role="alert" aria-live="assertive">
      <p style={{ margin: "0 0 8px", fontWeight: 600 }}>Syncing failed</p>
      {state.httpStatus != null ? (
        <p style={{ margin: 0 }}>NextAddress returned status {state.httpStatus}.</p>
      ) : (
        <p style={{ margin: 0 }}>We could not sync this contact update with NextAddress.</p>
      )}
      {state.retryable && onRetry ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          <button
            type="button"
            onClick={onRetry}
            disabled={retryDisabled}
            style={{
              appearance: "none",
              border: "1px solid #b91c1c",
              borderRadius: 6,
              background: "#fff",
              color: "#b91c1c",
              cursor: retryDisabled ? "not-allowed" : "pointer",
              font: "inherit",
              fontWeight: 600,
              padding: "6px 12px",
              opacity: retryDisabled ? 0.6 : 1,
            }}
          >
            Try again
          </button>
        </div>
      ) : null}
      <details style={{ marginTop: 10 }}>
        <summary style={{ cursor: "pointer", fontWeight: 500 }}>Error details</summary>
        <p
          style={{
            margin: "8px 0 0",
            padding: "8px 10px",
            borderRadius: 6,
            background: "rgb(127 29 29 / 0.06)",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontSize: "0.8125rem",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {state.errorMessage}
        </p>
      </details>
    </div>
  );
}
