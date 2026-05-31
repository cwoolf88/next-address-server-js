/** Typography tokens for the widget embed. */
export type WidgetFontPalette = {
  fontFamily: string;
  fontFamilyTitle: string;
  fontFamilyMono: string;
  fontSize: string;
  fontSizeSmall: string;
  fontSizeTitle: string;
  lineHeight: string;
  fontWeightBody: string;
  fontWeightEmphasis: string;
  letterSpacing: string;
};

/**
 * Color + typography tokens for the widget. Override any key when initializing the embed.
 */
export type WidgetPalette = WidgetFontPalette & {
  widgetBg: string;
  widgetBorder: string;
  widgetShadow: string;
  widgetRadius: string;
  widgetBackdropBlur: string;
  ink: string;
  muted: string;
  error: string;
  badgeMutedBg: string;
  badgeMutedText: string;
  badgeMutedRing: string;
  badgeInfoBg: string;
  badgeInfoText: string;
  badgeSuccessBg: string;
  badgeSuccessText: string;
  btnPrimaryBg: string;
  btnPrimaryHover: string;
  btnPrimaryText: string;
  btnSecondaryBg: string;
  btnSecondaryBorder: string;
  btnSecondaryHover: string;
  btnSecondaryText: string;
  btnShadow: string;
  hint: string;
  syncSyncingBorder: string;
  syncSyncingBg: string;
  syncSyncingText: string;
  syncSyncedBorder: string;
  syncSyncedBg: string;
  syncSyncedText: string;
  syncQueuedBorder: string;
  syncQueuedBg: string;
  syncQueuedText: string;
  syncFailedBorder: string;
  syncFailedBg: string;
  syncFailedText: string;
  retryBorder: string;
  retryText: string;
  retryHoverBg: string;
  errorMessageBg: string;
  ghostBase: string;
  ghostShine: string;
};

export type WidgetThemeName =
  | "default"
  | "minimal"
  | "dark"
  | "glass"
  | "vibrant"
  | "corporate";

/** Preset + optional token overrides. */
export type WidgetTheme =
  | WidgetThemeName
  | {
      preset?: WidgetThemeName;
      colors?: Partial<WidgetPalette>;
      /** Shorthand for typography-only overrides (merged with `colors`). */
      fonts?: Partial<WidgetFontPalette>;
    };

const FONT_SYSTEM: WidgetFontPalette = {
  fontFamily:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontFamilyTitle:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontFamilyMono:
    'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", monospace',
  fontSize: "0.875rem",
  fontSizeSmall: "0.75rem",
  fontSizeTitle: "0.9375rem",
  lineHeight: "1.45",
  fontWeightBody: "400",
  fontWeightEmphasis: "600",
  letterSpacing: "normal",
};

const WARM_NEUTRAL: WidgetPalette = {
  ...FONT_SYSTEM,
  widgetBg: "rgb(255 255 255 / 0.9)",
  widgetBorder: "#e8e4df",
  widgetShadow: "0 1px 2px rgb(28 25 23 / 0.06)",
  widgetRadius: "1rem",
  widgetBackdropBlur: "0",
  ink: "#1c1917",
  muted: "#78716c",
  error: "#dc2626",
  badgeMutedBg: "#faf8f5",
  badgeMutedText: "#78716c",
  badgeMutedRing: "#e8e4df",
  badgeInfoBg: "#e0f2fe",
  badgeInfoText: "#075985",
  badgeSuccessBg: "#d1fae5",
  badgeSuccessText: "#34a574",
  btnPrimaryBg: "#0d9488",
  btnPrimaryHover: "#0f766e",
  btnPrimaryText: "#ffffff",
  btnSecondaryBg: "#faf8f5",
  btnSecondaryBorder: "#e8e4df",
  btnSecondaryHover: "#f5f0e8",
  btnSecondaryText: "#1c1917",
  btnShadow: "0 1px 2px rgb(28 25 23 / 0.08)",
  hint: "#78716c",
  syncSyncingBorder: "#bfdbfe",
  syncSyncingBg: "#eff6ff",
  syncSyncingText: "#1e3a8a",
  syncSyncedBorder: "#bbf7d0",
  syncSyncedBg: "#f0fdf4",
  syncSyncedText: "#14532d",
  syncQueuedBorder: "#fde68a",
  syncQueuedBg: "#fffbeb",
  syncQueuedText: "#78350f",
  syncFailedBorder: "#fecaca",
  syncFailedBg: "#fef2f2",
  syncFailedText: "#7f1d1d",
  retryBorder: "#b91c1c",
  retryText: "#b91c1c",
  retryHoverBg: "#fee2e2",
  errorMessageBg: "rgb(127 29 29 / 0.06)",
  ghostBase: "#f5f5f4",
  ghostShine: "#e7e5e4",
};

/** Clean monochrome, tight radius — popular SaaS minimalism. */
const MINIMAL: WidgetPalette = {
  ...WARM_NEUTRAL,
  fontFamily:
    'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontFamilyTitle:
    'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSize: "0.8125rem",
  fontSizeTitle: "0.875rem",
  lineHeight: "1.5",
  letterSpacing: "-0.01em",
  widgetBg: "#ffffff",
  widgetBorder: "#e5e7eb",
  widgetShadow: "none",
  widgetRadius: "0.5rem",
  ink: "#111827",
  muted: "#6b7280",
  badgeMutedBg: "#f9fafb",
  badgeMutedText: "#6b7280",
  badgeMutedRing: "#e5e7eb",
  badgeInfoBg: "#f3f4f6",
  badgeInfoText: "#374151",
  badgeSuccessBg: "#ecfdf5",
  badgeSuccessText: "#047857",
  btnPrimaryBg: "#111827",
  btnPrimaryHover: "#1f2937",
  btnPrimaryText: "#ffffff",
  btnSecondaryBg: "#ffffff",
  btnSecondaryBorder: "#d1d5db",
  btnSecondaryHover: "#f9fafb",
  btnSecondaryText: "#111827",
  btnShadow: "none",
};

/** Dark UI trend — high contrast on near-black surfaces. */
const DARK: WidgetPalette = {
  ...WARM_NEUTRAL,
  fontFamily:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSizeTitle: "1rem",
  lineHeight: "1.5",
  widgetBg: "#18181b",
  widgetBorder: "#3f3f46",
  widgetShadow: "0 4px 24px rgb(0 0 0 / 0.35)",
  widgetRadius: "0.875rem",
  ink: "#fafafa",
  muted: "#a1a1aa",
  error: "#f87171",
  badgeMutedBg: "#27272a",
  badgeMutedText: "#a1a1aa",
  badgeMutedRing: "#52525b",
  badgeInfoBg: "#1e3a5f",
  badgeInfoText: "#93c5fd",
  badgeSuccessBg: "#14532d",
  badgeSuccessText: "#86efac",
  btnPrimaryBg: "#3b82f6",
  btnPrimaryHover: "#2563eb",
  btnPrimaryText: "#ffffff",
  btnSecondaryBg: "#27272a",
  btnSecondaryBorder: "#52525b",
  btnSecondaryHover: "#3f3f46",
  btnSecondaryText: "#fafafa",
  btnShadow: "0 1px 3px rgb(0 0 0 / 0.4)",
  hint: "#a1a1aa",
  syncSyncingBorder: "#1e40af",
  syncSyncingBg: "#172554",
  syncSyncingText: "#bfdbfe",
  syncSyncedBorder: "#166534",
  syncSyncedBg: "#14532d",
  syncSyncedText: "#bbf7d0",
  syncQueuedBorder: "#a16207",
  syncQueuedBg: "#422006",
  syncQueuedText: "#fde68a",
  syncFailedBorder: "#991b1b",
  syncFailedBg: "#450a0a",
  syncFailedText: "#fecaca",
  retryBorder: "#f87171",
  retryText: "#fecaca",
  retryHoverBg: "#450a0a",
  errorMessageBg: "rgb(248 113 113 / 0.12)",
  ghostBase: "#27272a",
  ghostShine: "#3f3f46",
};

/** Frosted glass / layered translucency. */
const GLASS: WidgetPalette = {
  ...WARM_NEUTRAL,
  fontWeightBody: "450",
  fontWeightEmphasis: "550",
  letterSpacing: "0.01em",
  widgetBg: "rgb(255 255 255 / 0.55)",
  widgetBorder: "rgb(255 255 255 / 0.45)",
  widgetShadow: "0 8px 32px rgb(15 23 42 / 0.12)",
  widgetRadius: "1.25rem",
  widgetBackdropBlur: "12px",
  ink: "#0f172a",
  muted: "#64748b",
  badgeMutedBg: "rgb(255 255 255 / 0.5)",
  badgeMutedText: "#475569",
  badgeMutedRing: "rgb(148 163 184 / 0.35)",
  badgeInfoBg: "rgb(224 242 254 / 0.85)",
  badgeInfoText: "#0369a1",
  badgeSuccessBg: "rgb(209 250 229 / 0.85)",
  badgeSuccessText: "#047857",
  btnPrimaryBg: "rgb(13 148 136 / 0.9)",
  btnPrimaryHover: "#0f766e",
  btnSecondaryBg: "rgb(255 255 255 / 0.65)",
  btnSecondaryBorder: "rgb(148 163 184 / 0.4)",
  btnSecondaryHover: "rgb(255 255 255 / 0.85)",
};

/** Bold accent, soft gradients — consumer / DTC trend. */
const VIBRANT: WidgetPalette = {
  ...WARM_NEUTRAL,
  fontFamily:
    '"Nunito", "Avenir Next", "Segoe UI", system-ui, -apple-system, sans-serif',
  fontFamilyTitle:
    '"Nunito", "Avenir Next", "Segoe UI", system-ui, -apple-system, sans-serif',
  fontSizeTitle: "1rem",
  fontWeightEmphasis: "700",
  letterSpacing: "0.02em",
  widgetBg: "linear-gradient(135deg, #fff7ed 0%, #fdf4ff 100%)",
  widgetBorder: "#f9a8d4",
  widgetShadow: "0 10px 40px rgb(236 72 153 / 0.15)",
  widgetRadius: "1.25rem",
  ink: "#4c1d95",
  muted: "#7c3aed",
  badgeMutedBg: "#faf5ff",
  badgeMutedText: "#7e22ce",
  badgeMutedRing: "#e9d5ff",
  badgeInfoBg: "#dbeafe",
  badgeInfoText: "#1d4ed8",
  badgeSuccessBg: "#dcfce7",
  badgeSuccessText: "#15803d",
  btnPrimaryBg: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
  btnPrimaryHover: "#db2777",
  btnPrimaryText: "#ffffff",
  btnSecondaryBg: "#ffffff",
  btnSecondaryBorder: "#f9a8d4",
  btnSecondaryHover: "#fdf4ff",
  btnSecondaryText: "#6b21a8",
  syncSyncingBorder: "#c4b5fd",
  syncSyncingBg: "#ede9fe",
  syncSyncingText: "#5b21b6",
};

/** Trust-forward blues and neutrals — fintech / enterprise trend. */
const CORPORATE: WidgetPalette = {
  ...WARM_NEUTRAL,
  fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontFamilyTitle: 'Georgia, "Times New Roman", "Segoe UI", serif',
  fontSize: "0.875rem",
  fontSizeSmall: "0.6875rem",
  fontSizeTitle: "1.0625rem",
  lineHeight: "1.55",
  fontWeightBody: "400",
  fontWeightEmphasis: "600",
  letterSpacing: "0.015em",
  widgetBg: "#ffffff",
  widgetBorder: "#cbd5e1",
  widgetShadow: "0 2px 8px rgb(15 23 42 / 0.08)",
  widgetRadius: "0.625rem",
  ink: "#0f172a",
  muted: "#64748b",
  badgeMutedBg: "#f1f5f9",
  badgeMutedText: "#475569",
  badgeMutedRing: "#cbd5e1",
  badgeInfoBg: "#dbeafe",
  badgeInfoText: "#1e40af",
  badgeSuccessBg: "#e0f2fe",
  badgeSuccessText: "#0369a1",
  btnPrimaryBg: "#1d4ed8",
  btnPrimaryHover: "#1e3a8a",
  btnPrimaryText: "#ffffff",
  btnSecondaryBg: "#f8fafc",
  btnSecondaryBorder: "#94a3b8",
  btnSecondaryHover: "#e2e8f0",
  btnSecondaryText: "#0f172a",
};

export const WIDGET_THEME_PRESETS: Record<WidgetThemeName, WidgetPalette> = {
  default: WARM_NEUTRAL,
  minimal: MINIMAL,
  dark: DARK,
  glass: GLASS,
  vibrant: VIBRANT,
  corporate: CORPORATE,
};

const CSS_VAR_MAP: Record<keyof WidgetPalette, string> = {
  fontFamily: "--na-font-family",
  fontFamilyTitle: "--na-font-family-title",
  fontFamilyMono: "--na-font-family-mono",
  fontSize: "--na-font-size",
  fontSizeSmall: "--na-font-size-sm",
  fontSizeTitle: "--na-font-size-title",
  lineHeight: "--na-line-height",
  fontWeightBody: "--na-font-weight-body",
  fontWeightEmphasis: "--na-font-weight-emphasis",
  letterSpacing: "--na-letter-spacing",
  widgetBg: "--na-widget-bg",
  widgetBorder: "--na-widget-border",
  widgetShadow: "--na-widget-shadow",
  widgetRadius: "--na-widget-radius",
  widgetBackdropBlur: "--na-widget-backdrop-blur",
  ink: "--na-ink",
  muted: "--na-muted",
  error: "--na-error",
  badgeMutedBg: "--na-badge-muted-bg",
  badgeMutedText: "--na-badge-muted-text",
  badgeMutedRing: "--na-badge-muted-ring",
  badgeInfoBg: "--na-badge-info-bg",
  badgeInfoText: "--na-badge-info-text",
  badgeSuccessBg: "--na-badge-success-bg",
  badgeSuccessText: "--na-badge-success-text",
  btnPrimaryBg: "--na-btn-primary-bg",
  btnPrimaryHover: "--na-btn-primary-hover",
  btnPrimaryText: "--na-btn-primary-text",
  btnSecondaryBg: "--na-btn-secondary-bg",
  btnSecondaryBorder: "--na-btn-secondary-border",
  btnSecondaryHover: "--na-btn-secondary-hover",
  btnSecondaryText: "--na-btn-secondary-text",
  btnShadow: "--na-btn-shadow",
  hint: "--na-hint",
  syncSyncingBorder: "--na-sync-syncing-border",
  syncSyncingBg: "--na-sync-syncing-bg",
  syncSyncingText: "--na-sync-syncing-text",
  syncSyncedBorder: "--na-sync-synced-border",
  syncSyncedBg: "--na-sync-synced-bg",
  syncSyncedText: "--na-sync-synced-text",
  syncQueuedBorder: "--na-sync-queued-border",
  syncQueuedBg: "--na-sync-queued-bg",
  syncQueuedText: "--na-sync-queued-text",
  syncFailedBorder: "--na-sync-failed-border",
  syncFailedBg: "--na-sync-failed-bg",
  syncFailedText: "--na-sync-failed-text",
  retryBorder: "--na-retry-border",
  retryText: "--na-retry-text",
  retryHoverBg: "--na-retry-hover-bg",
  errorMessageBg: "--na-error-message-bg",
  ghostBase: "--na-ghost-base",
  ghostShine: "--na-ghost-shine",
};

export function resolveWidgetPalette(theme?: WidgetTheme): WidgetPalette {
  let preset: WidgetThemeName = "default";
  let overrides: Partial<WidgetPalette> | undefined;

  if (theme == null) {
    return { ...WIDGET_THEME_PRESETS.default };
  }
  if (typeof theme === "string") {
    preset = theme;
  } else {
    preset = theme.preset ?? "default";
    overrides = { ...theme.colors, ...theme.fonts };
  }

  const base = WIDGET_THEME_PRESETS[preset] ?? WIDGET_THEME_PRESETS.default;
  return { ...base, ...overrides };
}

export function applyWidgetPalette(host: HTMLElement, palette: WidgetPalette): void {
  for (const key of Object.keys(CSS_VAR_MAP) as (keyof WidgetPalette)[]) {
    host.style.setProperty(CSS_VAR_MAP[key], palette[key]);
  }
}

export function clearWidgetPalette(host: HTMLElement): void {
  for (const cssVar of Object.values(CSS_VAR_MAP)) {
    host.style.removeProperty(cssVar);
  }
}
