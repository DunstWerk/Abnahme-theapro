import type { Content } from "pdfmake";
import type { TDocumentDefinitions } from "pdfmake/interfaces";
import type { AgendaDocument, ChecklistItem, SubSection, Top } from "../types/agenda";
import { HEADER_LABELS } from "../types/agenda";
import { STATUS_LABEL } from "../markdown/dialect";
import { statusGlyph } from "./statusGlyph";
import { buildMaengelSection } from "./maengelTable";
import { defaultStyle, pdfColors, styles } from "./pdfStyles";
import { borderlessLayout, itemsTableLayout, borderedTableLayout } from "./pdfLayouts";
import { buildWordmark, buildLegalFooter } from "./letterhead";
import { buildNiederschrift } from "./niederschrift";
import { buildAnlage1, buildAnlage2, buildAnlageTitle } from "./anlagen";
import { pdf as pdfTokens } from "../theme/tokens";

/** Anlage 3 zeigt bewusst nur die ursprünglichen 7 Rahmendaten-Felder (Meeting-Logistik) –
 * die neuen §1-Felder (Gewerk, Auftragsnummer, ...) stehen bereits in der Niederschrift selbst. */
const ANLAGE3_HEADER_FIELDS: (keyof typeof HEADER_LABELS)[] = [
  "projekt",
  "auftraggeber",
  "auftragnehmer",
  "fachplanung",
  "datum",
  "uhrzeit",
  "ort",
];

function buildRahmendaten(doc: AgendaDocument): Content {
  const rows: Content[][] = ANLAGE3_HEADER_FIELDS.map((field) => [
    { text: HEADER_LABELS[field], bold: true, margin: [0, 0, 0, 0] as [number, number, number, number] },
    { text: doc.header[field] || "–" },
  ]);
  for (const [label, value] of Object.entries(doc.header.weitere)) {
    rows.push([{ text: label, bold: true }, { text: value || "–" }]);
  }
  return {
    table: { widths: [110, "*"], body: rows },
    layout: borderlessLayout,
    margin: [0, 4, 0, 14],
  };
}

function buildTeilnehmer(doc: AgendaDocument): Content[] {
  if (doc.teilnehmer.length === 0) return [];
  return [
    { text: "Teilnehmer", style: "subHeading", margin: [0, 0, 0, 4] },
    {
      table: {
        headerRows: 1,
        widths: ["30%", "40%", "30%"],
        body: [
          [
            { text: "Name", style: "tableHeader" },
            { text: "Firma / Funktion", style: "tableHeader" },
            { text: "Rolle beim Termin", style: "tableHeader" },
          ],
          ...doc.teilnehmer.map((t) => [t.name || "–", t.firmaFunktion || "–", t.rolle || "–"]),
        ],
      },
      layout: borderedTableLayout,
      margin: [0, 0, 0, 14],
    },
  ];
}

function buildItemsTable(items: ChecklistItem[]): Content | null {
  const rows: Content[][] = [];

  function addRows(list: ChecklistItem[], indent: number) {
    for (const item of list) {
      const textStack: Content[] = [{ text: item.text, margin: [indent, 0, 0, 0], bold: item.status === "mangel" }];
      if (item.kommentar.trim() !== "") {
        textStack.push({ text: `Kommentar: ${item.kommentar}`, style: "itemComment", margin: [indent, 1, 0, 0] });
      }
      rows.push([
        { ...statusGlyph(item.status), margin: [0, 2, 0, 0] },
        { stack: textStack },
        { text: STATUS_LABEL[item.status], style: "statusLabel", alignment: "right" },
      ]);
      if (item.children.length) addRows(item.children, indent + 14);
    }
  }

  addRows(items, 0);
  if (rows.length === 0) return null;

  return {
    table: { widths: [14, "*", 62], body: rows, dontBreakRows: true },
    layout: itemsTableLayout,
    margin: [0, 2, 0, 8],
  };
}

function buildSubSection(section: SubSection): Content[] {
  const heading = section.nummer != null ? `${section.nummer} ${section.titel}` : section.titel;
  const content: Content[] = [{ text: heading, style: "subHeading", margin: [0, 8, 0, 4] }];
  if (section.preamble.length) content.push({ text: section.preamble.join(" "), style: "itemComment" });
  const table = buildItemsTable(section.items);
  if (table) content.push(table);
  return content;
}

function buildTop(top: Top, doc: AgendaDocument): Content[] {
  const heading = top.nummer != null ? `TOP ${top.nummer} – ${top.titel}` : top.titel;
  const headingBlock: Content = {
    unbreakable: true,
    stack: [
      {
        canvas: [{ type: "line", x1: 0, y1: 0, x2: 495, y2: 0, lineWidth: 1.5, lineColor: pdfColors.coral }],
        margin: [0, 12, 0, 4],
      },
      { text: heading, style: "topHeading" },
      ...(top.preamble.length
        ? [{ text: top.preamble.join(" "), style: "itemComment" as const, margin: [0, 2, 0, 0] as [number, number, number, number] }]
        : []),
    ],
  };

  const content: Content[] = [headingBlock];

  if (top.maengelAnchor) content.push(...buildMaengelSection(doc));

  const table = buildItemsTable(top.items);
  if (table) content.push(table);

  for (const section of top.sections) content.push(...buildSubSection(section));

  return content;
}

function buildSignatureBlock(doc: AgendaDocument): Content {
  const line = (label: string): Content[] => [
    {
      canvas: [{ type: "line", x1: 0, y1: 0, x2: 145, y2: 0, lineWidth: 0.75, lineColor: pdfColors.grey }],
      margin: [0, 28, 0, 3],
    },
    { text: label, style: "signatureLabel" },
  ];
  return {
    columns: [
      { stack: line(`AG${doc.header.auftraggeber ? " – " + doc.header.auftraggeber : ""}`) },
      { stack: line(`AN${doc.header.auftragnehmer ? " – " + doc.header.auftragnehmer : ""}`) },
      { stack: line(`Fachplanung${doc.header.fachplanung ? " – " + doc.header.fachplanung : ""}`) },
    ],
    columnGap: 16,
    margin: [0, 24, 0, 0],
  };
}

/** Anlage 3 = das ursprüngliche Checklisten-Protokoll (TOP für TOP), unverändert bis auf den Anlage-Titel. */
function buildAnlage3(doc: AgendaDocument): Content[] {
  return [
    ...buildAnlageTitle(3, "Protokoll der Abnahmebegehung (Checkliste)"),
    { text: doc.titel, style: "docTitle" },
    {
      canvas: [{ type: "line", x1: 0, y1: 0, x2: 495, y2: 0, lineWidth: 2, lineColor: pdfColors.coral }],
      margin: [0, 4, 0, 0],
    },
    buildRahmendaten(doc),
    ...buildTeilnehmer(doc),
    ...(doc.hinweis.trim() !== ""
      ? [{ text: doc.hinweis, style: "itemComment" as const, margin: [0, 0, 0, 14] as [number, number, number, number] }]
      : []),
    ...doc.tops.flatMap((top) => buildTop(top, doc)),
    ...(doc.schlussHinweis.trim() !== ""
      ? [{ text: doc.schlussHinweis, style: "itemComment" as const, margin: [0, 14, 0, 0] as [number, number, number, number] }]
      : []),
    buildSignatureBlock(doc),
  ];
}

export interface BuildDocDefinitionOptions {
  /** Für Tests/Reproduzierbarkeit: fester Zeitstempel statt "jetzt". */
  now?: Date;
}

export function buildDocDefinition(doc: AgendaDocument, options: BuildDocDefinitionOptions = {}): TDocumentDefinitions {
  const now = options.now ?? new Date();

  const content: Content[] = [
    ...buildNiederschrift(doc, now),
    ...buildAnlage1(doc),
    ...buildAnlage2(doc),
    ...buildAnlage3(doc),
  ];

  return {
    pageSize: "A4",
    pageMargins: pdfTokens.pageMargins,
    info: {
      title: `Niederschrift Abnahme – ${doc.header.projekt || doc.titel}`,
      subject: "Niederschrift – Abnahme nach VOB/B § 12",
    },
    header: (currentPage) =>
      currentPage > 1
        ? {
            columns: [
              { text: "Abnahme", style: "headerText" },
              buildWordmark(65),
            ],
            margin: [50, 22, 50, 0] as [number, number, number, number],
          }
        : undefined,
    footer: (currentPage, pageCount) => buildLegalFooter(currentPage, pageCount, now),
    content,
    styles,
    defaultStyle,
  };
}
