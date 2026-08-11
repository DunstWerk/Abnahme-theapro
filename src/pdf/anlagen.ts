import type { Content } from "pdfmake";
import type { AgendaDocument } from "../types/agenda";
import { compileMaengel } from "../state/selectors";
import { formatDateDe } from "../markdown/normalize";
import { dataTableLayout } from "./pdfLayouts";

const MIN_ROWS = 12;

const COLS: Content[] = [
  { text: "Lfd. Nr.", style: "tableHeader" },
  { text: "Bezeichnung", style: "tableHeader" },
  { text: "Art des Mangels", style: "tableHeader" },
  { text: "Zuständig / zu erledigen bis", style: "tableHeader" },
];

function padRows(body: Content[][], minRows: number): Content[][] {
  const padded = [...body];
  while (padded.length - 1 < minRows) padded.push([" ", " ", " ", " "]);
  return padded;
}

/** "Anlage N zur Abnahmeniederschrift" + Untertitel, mit Seitenumbruch davor. */
export function buildAnlageTitle(nr: number, untertitel: string): Content[] {
  return [
    { text: `Anlage ${nr} zur Abnahmeniederschrift`, style: "anlageTitle", pageBreak: "before", margin: [0, 0, 0, 2] },
    { text: untertitel, style: "subHeading", margin: [0, 0, 0, 10] },
  ];
}

export function buildAnlage1(doc: AgendaDocument): Content[] {
  const maengel = compileMaengel(doc);
  const body: Content[][] = [
    COLS,
    ...maengel.map((m) => {
      const artStack: Content[] = [{ text: m.beschreibung }];
      if (m.kommentar) artStack.push({ text: m.kommentar, style: "itemComment" });
      if (m.schweregrad) {
        artStack.push({
          text: `Einstufung: ${m.schweregrad}`,
          style: m.schweregrad === "wesentlich" ? "mangelWesentlich" : "itemComment",
        });
      }
      return [
        String(m.nr),
        m.ortKurz,
        { stack: artStack },
        { stack: [{ text: doc.header.auftragnehmer || "Auftragnehmer" }, { text: formatDateDe(m.frist) || "–" }] },
      ];
    }),
  ];
  return [
    ...buildAnlageTitle(1, "Mängelliste"),
    {
      text: 'Die Einstufung in "wesentlich" und "unwesentlich" richtet sich nach § 12 Abs. 3 VOB/B.',
      style: "itemComment",
      margin: [0, 0, 0, 6],
    },
    {
      table: { headerRows: 1, widths: [42, 110, "*", 100], body: padRows(body, MIN_ROWS), dontBreakRows: true },
      layout: dataTableLayout,
    },
  ];
}

export function buildAnlage2(doc: AgendaDocument): Content[] {
  const body: Content[][] = [
    COLS,
    ...doc.feststellungen.map((f, idx) => [
      String(idx + 1),
      f.bezeichnung,
      f.beschreibung,
      { stack: [{ text: f.zustaendig || " " }, { text: formatDateDe(f.frist) || "–" }] },
    ]),
  ];
  return [
    ...buildAnlageTitle(2, "Feststellungen und Festlegungen"),
    {
      table: { headerRows: 1, widths: [42, 110, "*", 100], body: padRows(body, MIN_ROWS), dontBreakRows: true },
      layout: dataTableLayout,
    },
  ];
}
