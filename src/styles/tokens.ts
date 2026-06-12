// src/styles/tokens.ts
// ─────────────────────────────────────────────────────────────
// DESIGN TOKENS — Single source of truth for all visual values.
// Import from here, never hardcode colors or fonts in components.
// ─────────────────────────────────────────────────────────────

export const colors = {
  // ── Brand ────────────────────────────────────────────────
  gold:       "#B8975A",
  goldLight:  "#D4B07A",
  cream:      "#F5F0E8",
  ivory:      "#FAF8F4",

  // ── Neutrals ─────────────────────────────────────────────
  charcoal:   "#1C1C1E",
  slate:      "#4A4A52",
  mist:       "#E8E4DC",
  white:      "#FFFFFF",

  // ── Semantic ─────────────────────────────────────────────
  success:    "#3D7A5F",
  successLight:"#EAF3E8",
  rose:       "#8B4A5A",
  roseLight:  "#F5EAE8",
  info:       "#2C6FAC",
  infoLight:  "#E8F0FA",
  warn:       "#7A6530",
  warnLight:  "#FDF6E8",

  // ── Dark surfaces ─────────────────────────────────────────
  sidebar:    "#111114",
  sidebarHover:"#1E1E22",
} as const;

export const fonts = {
  display: "'Cormorant Garamond', Georgia, serif",
  body:    "'DM Sans', system-ui, sans-serif",
} as const;

export const fontSizes = {
  xs:   11,
  sm:   12,
  base: 14,
  md:   15,
  lg:   16,
  xl:   18,
  "2xl": 22,
  "3xl": 28,
  "4xl": 36,
  "5xl": 44,
} as const;

export const fontWeights = {
  light:   300,
  regular: 400,
  medium:  500,
  semibold: 600,
  bold:    700,
} as const;

export const spacing = {
  0:  0,
  1:  4,
  2:  8,
  3:  12,
  4:  16,
  5:  20,
  6:  24,
  7:  28,
  8:  32,
  9:  36,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const radii = {
  sm:   6,
  md:   8,
  lg:   12,
  xl:   16,
  "2xl": 20,
  full: 9999,
} as const;

export const shadows = {
  sm:  "0 1px 3px rgba(0,0,0,.06)",
  md:  "0 4px 12px rgba(0,0,0,.08)",
  lg:  "0 8px 24px rgba(0,0,0,.10)",
  xl:  "0 16px 40px rgba(0,0,0,.12)",
  "2xl": "0 24px 64px rgba(0,0,0,.16)",
} as const;

// Avatar color map (initials → background color)
export const avatarColors: Record<string, string> = {
  MJ: colors.gold,
  AR: colors.success,
  DW: colors.info,
  KM: colors.rose,
  TB: colors.warn,
  SC: colors.slate,
  NH: colors.charcoal,
  AW: colors.info,
};

// Convenience alias
export const C = colors;

export type ColorKey = keyof typeof colors;
export type FontKey  = keyof typeof fonts;
