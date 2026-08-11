import type { CustomTableLayout } from "pdfmake";
import { pdfColors } from "./pdfStyles";

/** Gemeinsame Tabellen-Layouts, von docDefinition.ts/niederschrift.ts/anlagen.ts genutzt. */

export const borderlessLayout: CustomTableLayout = {
  hLineWidth: () => 0,
  vLineWidth: () => 0,
  paddingLeft: () => 0,
  paddingRight: (i, node) => (i === (node.table.widths?.length ?? 1) - 1 ? 0 : 10),
  paddingTop: () => 2,
  paddingBottom: () => 2,
};

export const itemsTableLayout: CustomTableLayout = {
  hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 0 : 0.5),
  vLineWidth: () => 0,
  hLineColor: () => pdfColors.grey,
  paddingLeft: () => 2,
  paddingRight: () => 2,
  paddingTop: () => 3,
  paddingBottom: () => 3,
};

export const borderedTableLayout: CustomTableLayout = {
  hLineWidth: () => 0.5,
  vLineWidth: () => 0.5,
  hLineColor: () => pdfColors.grey,
  vLineColor: () => pdfColors.grey,
  paddingLeft: () => 5,
  paddingRight: () => 5,
  paddingTop: () => 3,
  paddingBottom: () => 3,
};

export const dataTableLayout: CustomTableLayout = {
  hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 0.75 : 0.5),
  vLineWidth: () => 0,
  hLineColor: () => pdfColors.grey,
  paddingLeft: () => 4,
  paddingRight: () => 4,
  paddingTop: () => 3,
  paddingBottom: () => 3,
};
