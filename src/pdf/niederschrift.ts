import type { Content } from "pdfmake";
import type { AgendaDocument, Verjaehrungsfrist } from "../types/agenda";
import { abnahmeWort, ergebnisLabel } from "../types/agenda";
import { formatDateDe } from "../markdown/normalize";
import { maengelNummernBereich } from "../state/selectors";
import { pdfColors } from "./pdfStyles";
import { borderlessLayout, borderedTableLayout, dataTableLayout } from "./pdfLayouts";
import { checkboxGlyph } from "./statusGlyph";
import { buildLetterhead } from "./letterhead";

function buildMassnahme(doc: AgendaDocument): Content[] {
  const h = doc.header;
  const rows: Content[][] = [
    [{ text: "Bauvorhaben / Objekt:", bold: true }, { text: h.projekt || "–" }],
    [{ text: "Art der Arbeiten / Gewerk:", bold: true }, { text: h.gewerk || "–" }],
    [
      {
        stack: [
          { text: "Auftragsdatum / Auftragsnummer:", bold: true },
          { text: "(ggfls. mit Nachaufträgen)", style: "itemComment" },
        ],
      },
      { text: h.auftragsnummer || "–" },
    ],
    [{ text: "Auftragnehmer (AN):", bold: true }, { text: h.auftragnehmer || "–" }],
    [
      { text: "Auftraggeber (AG):", bold: true },
      { stack: [{ text: h.auftraggeber || "–" }, ...(h.auftraggeberAdresse ? [{ text: h.auftraggeberAdresse }] : [])] },
    ],
    [{ text: `Datum der ${abnahmeWort(doc.oenorm, true)}:`, bold: true }, { text: formatDateDe(h.datum) || "–" }],
  ];
  return [
    { text: "1.  Maßnahme", style: "subHeading", margin: [0, 10, 0, 6] },
    { table: { widths: [150, "*"], body: rows }, layout: borderlessLayout, margin: [0, 0, 0, 14] },
  ];
}

function buildTeilnehmerNiederschrift(doc: AgendaDocument): Content[] {
  if (doc.teilnehmer.length === 0) return [];
  return [
    { text: `2.  Teilnehmer der ${abnahmeWort(doc.oenorm, true)}`, style: "subHeading", margin: [0, 4, 0, 6] },
    {
      table: {
        headerRows: 1,
        widths: ["55%", "45%"],
        body: [
          [
            { text: "Firma / Institution", style: "tableHeader" },
            { text: "Name", style: "tableHeader" },
          ],
          ...doc.teilnehmer.map((t) => [t.firmaFunktion || "–", t.name || "–"]),
        ],
      },
      layout: borderedTableLayout,
      margin: [0, 0, 0, 14],
    },
  ];
}

function ergebnisRow(checked: boolean, text: string): Content {
  return {
    columns: [
      { width: 12, ...checkboxGlyph(checked) },
      { width: "*", text, margin: [6, 0, 0, 0] },
    ],
    margin: [0, 2, 0, 2],
  };
}

function buildErgebnis(doc: AgendaDocument): Content[] {
  const n = doc.niederschrift;
  const bereich = maengelNummernBereich(doc);
  const fristText = n.maengelbeseitigungFrist ? formatDateDe(n.maengelbeseitigungFrist) : "________________";

  return [
    { text: `3.  Ergebnis der ${abnahmeWort(doc.oenorm, true)}`, style: "subHeading", margin: [0, 10, 0, 6] },
    {
      columns: [
        { width: 95, text: "3.1  Die Leistung wurde" },
        {
          width: "*",
          stack: [
            ergebnisRow(n.ergebnis === "ohneMaengel", ergebnisLabel("ohneMaengel", doc.oenorm, bereich)),
            ergebnisRow(n.ergebnis === "nichtAbgenommen", ergebnisLabel("nichtAbgenommen", doc.oenorm, bereich)),
            ergebnisRow(n.ergebnis === "mitMaengeln", ergebnisLabel("mitMaengeln", doc.oenorm, bereich)),
          ],
        },
      ],
    },
    { text: "3.2. Die ausführende Firma verpflichtet sich, diese Mängel umgehend sachgemäß zu beheben.", margin: [0, 10, 0, 2] },
    { text: `Als Frist hierfür wird folgender Termin gesetzt: ${fristText}` },
    ergebnisRow(n.fristAngemessen, "Die Frist wird als angemessen erachtet."),
    { text: "Die Mängelbeseitigung ist dem AG und der OÜ schriftlich anzuzeigen.", margin: [0, 0, 0, 10] },
    {
      columns: [
        { width: 95, text: "3.3  Die Leistung wurde" },
        {
          width: "*",
          stack: [
            ergebnisRow(n.termintreue === "termingerecht", "termingerecht fertiggestellt."),
            ergebnisRow(
              n.termintreue === "nichtTermingerecht",
              "nicht termingerecht fertiggestellt. Der AG behält sich vor, eine ggfls. vereinbarte Vertragsstrafe geltend zu machen.",
            ),
          ],
        },
      ],
      margin: [0, 4, 0, 0],
    },
    { text: "3.4  Alle Rechte des AG auf Gewährleistung und Schadenersatz bleiben unberührt.", margin: [0, 10, 0, 14] },
  ];
}

const VERJAEHRUNG_MIN_ROWS = 4;

function verjaehrungTable(list: Verjaehrungsfrist[]): Content {
  const body: Content[][] = [
    [
      { text: "Nr.", style: "tableHeader" },
      { text: "Anlagenteil", style: "tableHeader" },
      { text: "Beginn", style: "tableHeader" },
      { text: "Ende", style: "tableHeader" },
    ],
    ...list.map((v) => [v.nr || " ", v.anlagenteil || " ", v.beginn || " ", v.ende || " "]),
  ];
  while (body.length - 1 < VERJAEHRUNG_MIN_ROWS) body.push([" ", " ", " ", " "]);
  return {
    table: { headerRows: 1, widths: [30, "*", 80, 80], body, dontBreakRows: true },
    layout: dataTableLayout,
    margin: [0, 4, 0, 10],
  };
}

function buildVerjaehrung(doc: AgendaDocument): Content[] {
  const n = doc.niederschrift;
  const fristWort = doc.oenorm ? "Gewährleistungsfristen" : "Verjährungsfristen für Mängelansprüche";
  const ueberschrift = doc.oenorm ? "4.  Gewährleistungsfrist" : "4.  Verjährungsfrist für Mängelansprüche";
  const rechtsgrundlageSatz = doc.oenorm
    ? `4.1  Gemäß ÖNORM B 2110 und vertraglicher Vereinbarungen gelten folgende ${fristWort}:`
    : `4.1  Gemäß VOB/B § 13 und vertraglicher Vereinbarungen gelten folgende ${fristWort} (früher: Gewährleistung):`;
  return [
    { text: ueberschrift, style: "subHeading", margin: [0, 10, 0, 6] },
    { text: rechtsgrundlageSatz },
    verjaehrungTable(n.verjaehrung),
    {
      text: `4.2  Für die Nr. ${n.wartungsvertragNr || "___"} aus der vorstehenden Aufstellung gelten bei Abschluss eines Wartungsvertrages folgende geänderte ${fristWort}:`,
    },
    verjaehrungTable(n.verjaehrungWartung),
  ];
}

function buildSonstiges(doc: AgendaDocument): Content[] {
  const text = doc.niederschrift.sonstiges.trim();
  return [
    { text: "5.  Sonstiges", style: "subHeading", margin: [0, 10, 0, 6] },
    text !== "" ? { text, margin: [0, 0, 0, 14] } : { text: " ", margin: [0, 0, 0, 60] },
  ];
}

function signatureCell(name: string, funktion: string): Content {
  return {
    stack: [
      {
        canvas: [{ type: "line", x1: 0, y1: 0, x2: 145, y2: 0, lineWidth: 0.75, lineColor: pdfColors.grey }],
        margin: [0, 26, 0, 3],
      },
      { text: name || " ", style: "signatureLabel" },
      ...(funktion ? [{ text: funktion, style: "signatureLabel" as const }] : []),
    ],
  };
}

function buildUnterschriften(doc: AgendaDocument): Content[] {
  const h = doc.header;
  const list = doc.niederschrift.unterschriften;
  const rows: Content[] = [];
  for (let i = 0; i < list.length; i += 3) {
    const chunk = list.slice(i, i + 3);
    rows.push({ columns: chunk.map((u) => signatureCell(u.name, u.funktion)), columnGap: 16, margin: [0, 10, 0, 0] });
  }
  return [
    { text: "6.  Unterschriften", style: "subHeading", margin: [0, 10, 0, 6] },
    {
      canvas: [{ type: "line", x1: 0, y1: 0, x2: 220, y2: 0, lineWidth: 0.75, lineColor: pdfColors.grey }],
      margin: [0, 20, 0, 3],
    },
    { text: `${formatDateDe(h.datum) || "…"}, ${h.bearbeiter || "…"}`, style: "signatureLabel", margin: [0, 0, 0, 10] },
    ...rows,
  ];
}

/** §1–§6 der Niederschrift, inkl. Briefkopf und Titel. Anlagen 1–3 kommen aus anlagen.ts/docDefinition.ts. */
export function buildNiederschrift(doc: AgendaDocument, now: Date): Content[] {
  return [
    buildLetterhead(doc, now),
    {
      text: doc.oenorm ? "Niederschrift – Übernahme nach ÖNORM B 2110" : "Niederschrift - Abnahme nach VOB/B § 12",
      style: "docTitle",
      margin: [0, 4, 0, 10],
    },
    ...buildMassnahme(doc),
    ...buildTeilnehmerNiederschrift(doc),
    ...buildErgebnis(doc),
    ...buildVerjaehrung(doc),
    ...buildSonstiges(doc),
    ...buildUnterschriften(doc),
  ];
}
