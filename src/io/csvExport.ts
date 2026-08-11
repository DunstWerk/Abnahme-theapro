import type { AgendaDocument, ChecklistItem } from "../types/agenda";
import { STATUS_LABEL } from "../markdown/dialect";
import { compileMaengel } from "../state/selectors";
import { formatDateDe } from "../markdown/normalize";

const DELIM = ";";
const BOM = "﻿";

function csvField(value: string): string {
  const v = value ?? "";
  if (v.includes(DELIM) || v.includes('"') || v.includes("\n") || v.includes("\r")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function csvRow(cells: string[]): string {
  return cells.map(csvField).join(DELIM);
}

function itemsToRows(items: ChecklistItem[], topLabel: string, abschnitt: string, rows: string[]): void {
  let nr = 0;
  for (const item of items) {
    nr += 1;
    rows.push(
      csvRow([
        topLabel,
        abschnitt,
        String(nr),
        item.text,
        STATUS_LABEL[item.status],
        item.kommentar,
        item.schweregrad ?? "",
        formatDateDe(item.frist),
      ]),
    );
    if (item.children.length) itemsToRows(item.children, topLabel, abschnitt, rows);
  }
}

export function buildChecklistCsv(doc: AgendaDocument): string {
  const rows = [csvRow(["TOP", "Abschnitt", "Nr", "Text", "Status", "Kommentar", "Schweregrad", "Frist"])];
  for (const top of doc.tops) {
    const topLabel = top.nummer != null ? `TOP ${top.nummer} – ${top.titel}` : top.titel;
    if (top.items.length) itemsToRows(top.items, topLabel, "", rows);
    for (const sec of top.sections) {
      const secLabel = sec.nummer != null ? `${sec.nummer} ${sec.titel}` : sec.titel;
      itemsToRows(sec.items, topLabel, secLabel, rows);
    }
  }
  return BOM + rows.join("\r\n") + "\r\n";
}

export function buildMaengelCsv(doc: AgendaDocument): string {
  const rows = [csvRow(["Nr", "Mangel", "Ort/System", "Einstufung", "Frist", "Kommentar"])];
  for (const m of compileMaengel(doc)) {
    rows.push(csvRow([`M${m.nr}`, m.beschreibung, m.ortLabel, m.schweregrad ?? "", formatDateDe(m.frist), m.kommentar]));
  }
  return BOM + rows.join("\r\n") + "\r\n";
}
