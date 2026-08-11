/**
 * Firmenfarben – einzige Quelle der Wahrheit für Bildschirm (index.css spiegelt
 * dieselben Hex-Werte als CSS-Variablen) und PDF (pdf/pdfStyles.ts importiert
 * direkt von hier). Bei einer Farbänderung nur hier anpassen.
 */
export const colors = {
  coral: "#ED6950",
  ice: "#B3DDDE",
  grey: "#BFD2D4",
  olive: "#7B9B47",
  white: "#FFFFFF",
  ink: "#1A1A1A",
} as const;

export const statusColors = {
  offen: colors.grey,
  iO: colors.olive,
  mangel: colors.coral,
  entfaellt: "#8A8A8A",
} as const;

export const pdf = {
  baseFontSize: 10,
  headingFontSize: {
    top: 13,
    sub: 11,
  },
  pageMargins: [50, 62, 50, 90] as [number, number, number, number],
} as const;
