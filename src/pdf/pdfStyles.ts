import { colors, pdf as pdfTokens } from "../theme/tokens";
import { FONT_FAMILY } from "./pdfFonts";

/** Einzige Stelle, die die PDF-Basisschriftgröße bestimmt (siehe docs/markdown-dialekt.md Hinweis zu 10pt). */
export const PDF_BASE_SIZE = pdfTokens.baseFontSize;

export const pdfColors = colors;

export const defaultStyle = {
  font: FONT_FAMILY,
  fontSize: PDF_BASE_SIZE,
  lineHeight: 1.15,
  color: colors.ink,
};

export const styles = {
  docTitle: { fontSize: 13, bold: true, color: colors.ink },
  topHeading: { fontSize: pdfTokens.headingFontSize.top, bold: true, color: colors.coral },
  subHeading: { fontSize: pdfTokens.headingFontSize.sub, bold: true, color: colors.ink },
  sectionLabel: { fontSize: 9, bold: true, color: colors.coral, characterSpacing: 0.5 },
  tableHeader: { bold: true, fontSize: PDF_BASE_SIZE, color: colors.ink, fillColor: colors.ice },
  itemComment: { fontSize: PDF_BASE_SIZE, italics: true, color: "#555555" },
  statusLabel: { fontSize: PDF_BASE_SIZE - 1, color: "#555555" },
  footerText: { fontSize: 8, color: "#777777" },
  headerText: { fontSize: 8, color: "#777777" },
  mangelWesentlich: { bold: true, color: colors.coral },
  signatureLabel: { fontSize: 8, color: "#555555" },
  anlageTitle: { fontSize: 13, bold: true, color: colors.coral },
  letterheadLabel: { fontSize: 9, color: "#555555" },
  legalFooter: { fontSize: 6.5, color: "#777777", lineHeight: 1.15 },
};
