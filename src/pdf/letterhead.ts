import type { Content } from "pdfmake";
import type { AgendaDocument } from "../types/agenda";
import { formatDateDe } from "../markdown/normalize";
import { pdfColors } from "./pdfStyles";
import { borderlessLayout } from "./pdfLayouts";

/** Feste Firmen-/Briefkopfdaten. Ändern sich praktisch nie – zentrale Stelle für Anpassungen. */
export const COMPANY = {
  name: "theapro GmbH",
  strasse: "Schwanthalerstraße 16",
  plzOrt: "80336 München",
  telefon: "+49 (0) 89 74 00 53 – 0",
  email: "info@theapro.de",
  web: "www.theapro.de",
  sitz: "Sitz der Gesellschaft: München",
  hrb: "HRB 141 666",
  registergericht: "Registergericht München",
  geschaeftsfuehrung: ["Björn Ley B. Pro.", "Boris Viehbeck M. Eng.", "Thomas Lüdicke Dipl. Ing."],
  bank: "Sparkasse Rosenheim-Bad Aibling",
  iban: "IBAN: DE52 7115 0000 0020 1575 17",
  bic: "BIC: BYLADEM1ROS",
} as const;

/**
 * Platzhalter für den theapro-Schriftzug, solange keine echte Logo-Bilddatei vorliegt.
 * Für ein echtes Logo: Bilddatei unter src/assets/ ablegen, per `import logo from "./logo.png?inline"`
 * importieren (Vite liefert dann eine Data-URL) und hier stattdessen
 * `{ image: logo, width: 110, alignment: "right" }` zurückgeben.
 */
export function buildWordmark(): Content {
  return { text: "theapro", color: pdfColors.coral, bold: true, fontSize: 18, characterSpacing: 0.5, alignment: "right" };
}

export function buildLetterhead(doc: AgendaDocument, now: Date): Content {
  const left: Content[] = [
    { text: `Datum: ${formatDateDe(now.toISOString().slice(0, 10))}`, style: "letterheadLabel" },
    { text: `Bearbeiter: ${doc.header.bearbeiter}`, style: "letterheadLabel", margin: [0, 2, 0, 0] },
    { text: "Telefon:", style: "letterheadLabel", margin: [0, 10, 0, 0] },
    { text: "E-Mail:", style: "letterheadLabel", margin: [0, 2, 0, 0] },
  ];
  const right: Content[] = [
    buildWordmark(),
    { text: COMPANY.name, alignment: "right", margin: [0, 6, 0, 0] },
    { text: COMPANY.strasse, alignment: "right" },
    { text: COMPANY.plzOrt, alignment: "right" },
    { text: COMPANY.telefon, alignment: "right", margin: [0, 6, 0, 0] },
    { text: COMPANY.email, alignment: "right" },
    { text: COMPANY.web, alignment: "right" },
  ];
  return {
    table: { widths: ["*", "*"], body: [[{ stack: left }, { stack: right }]] },
    layout: borderlessLayout,
    margin: [0, 0, 0, 16],
  };
}

export function buildLegalFooter(currentPage: number, pageCount: number, now: Date): Content {
  return {
    stack: [
      {
        canvas: [{ type: "line", x1: 50, y1: 0, x2: 545, y2: 0, lineWidth: 0.5, lineColor: pdfColors.grey }],
      },
      {
        columns: [
          { width: "34%", text: [COMPANY.sitz, "\n", COMPANY.hrb, "\n", COMPANY.registergericht], style: "legalFooter" },
          {
            width: "33%",
            text: ["Geschäftsführung:\n", COMPANY.geschaeftsfuehrung.join("\n")],
            style: "legalFooter",
          },
          { width: "33%", text: [COMPANY.bank, "\n", COMPANY.iban, "\n", COMPANY.bic], style: "legalFooter" },
        ],
        margin: [50, 4, 50, 0],
      },
      {
        text: `Druckdatum: ${formatDateDe(now.toISOString().slice(0, 10))}   ·   Seite ${currentPage} von ${pageCount}`,
        style: "footerText",
        alignment: "center",
        margin: [50, 5, 50, 0],
      },
    ],
  };
}
