import type { Content, CustomTableLayout } from "pdfmake";
import type { AgendaDocument } from "../types/agenda";
import { compileMaengel } from "../state/selectors";
import { formatDateDe } from "../markdown/normalize";
import { pdfColors } from "./pdfStyles";

const maengelTableLayout: CustomTableLayout = {
  hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 0.75 : 0.5),
  vLineWidth: () => 0,
  hLineColor: () => pdfColors.grey,
  paddingLeft: () => 4,
  paddingRight: () => 4,
  paddingTop: () => 3,
  paddingBottom: () => 3,
};

export function buildMaengelSection(doc: AgendaDocument): Content[] {
  const maengel = compileMaengel(doc);

  if (maengel.length === 0) {
    return [{ text: "Es wurden keine Mängel festgestellt.", margin: [0, 2, 0, 10] }];
  }

  const body: Content[] = [
    {
      text: 'Die Einstufung in "wesentlich" und "unwesentlich" richtet sich nach § 12 Abs. 3 VOB/B.',
      style: "itemComment",
      margin: [0, 2, 0, 6],
    },
    {
      table: {
        headerRows: 1,
        widths: [24, "*", 110, 62, 58],
        dontBreakRows: true,
        body: [
          [
            { text: "Nr", style: "tableHeader" },
            { text: "Mangel", style: "tableHeader" },
            { text: "Ort/System", style: "tableHeader" },
            { text: "Einstufung", style: "tableHeader" },
            { text: "Frist", style: "tableHeader" },
          ],
          ...maengel.map((m) => [
            `M${m.nr}`,
            m.kommentar
              ? { stack: [{ text: m.beschreibung }, { text: m.kommentar, style: "itemComment" }] }
              : m.beschreibung,
            m.ortLabel,
            m.schweregrad === "wesentlich"
              ? { text: m.schweregrad, style: "mangelWesentlich" }
              : (m.schweregrad ?? "–"),
            formatDateDe(m.frist) || "–",
          ]),
        ],
      },
      layout: maengelTableLayout,
      margin: [0, 0, 0, 10],
    },
  ];

  return body;
}
