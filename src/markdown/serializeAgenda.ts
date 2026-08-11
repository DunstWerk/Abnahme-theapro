import type { AgendaDocument, ChecklistItem, Top } from "../types/agenda";
import {
  ANCHOR_LINE,
  CURRENT_FORMAT_VERSION,
  FORMAT_ID,
  HEADER_FIELD_ORDER,
  STATUS_LABEL,
  STATUS_TO_CHECKBOX,
  TEILNEHMER_HEADER_ROW,
  TEILNEHMER_SEP_ROW,
} from "./dialect";

export interface SerializeOptions {
  /** Für Tests: fester Zeitstempel statt "jetzt". */
  now?: Date;
}

export function serializeAgenda(doc: AgendaDocument, options: SerializeOptions = {}): string {
  const exported = (options.now ?? new Date()).toISOString().replace(/\.\d{3}Z$/, "Z");
  const blocks: string[][] = [];

  blocks.push(["---", `format: ${FORMAT_ID}/${doc.formatVersion || CURRENT_FORMAT_VERSION}`, `exported: ${exported}`, "---"]);
  blocks.push([`# ${doc.titel}`]);
  blocks.push(serializeRahmendaten(doc));
  blocks.push(serializeTeilnehmer(doc));
  if (doc.hinweis.trim() !== "") {
    blocks.push(["## Hinweis", "", ...doc.hinweis.split("\n")]);
  }
  for (const top of doc.tops) {
    blocks.push(serializeTop(top));
  }
  if (doc.schlussHinweis.trim() !== "") {
    blocks.push(["## Schlusshinweis", "", ...doc.schlussHinweis.split("\n")]);
  }

  return blocks.map((b) => b.join("\n")).join("\n\n") + "\n";
}

function serializeRahmendaten(doc: AgendaDocument): string[] {
  const lines = ["## Rahmendaten", ""];
  for (const entry of HEADER_FIELD_ORDER) {
    lines.push(`- **${entry.label}:** ${doc.header[entry.field]}`);
  }
  for (const [label, value] of Object.entries(doc.header.weitere)) {
    lines.push(`- **${label}:** ${value}`);
  }
  return lines;
}

function serializeTeilnehmer(doc: AgendaDocument): string[] {
  const lines = ["## Teilnehmer", "", TEILNEHMER_HEADER_ROW, TEILNEHMER_SEP_ROW];
  for (const t of doc.teilnehmer) {
    lines.push(`| ${t.name} | ${t.firmaFunktion} | ${t.rolle} |`);
  }
  return lines;
}

function serializeTop(top: Top): string[] {
  const heading = top.nummer != null ? `TOP ${top.nummer} – ${top.titel}` : top.rawHeading;
  const lines = [`## ${heading}`, ""];
  const bodyLines = serializeBody(top.preamble, top.items, top.maengelAnchor);
  lines.push(...bodyLines);

  for (const section of top.sections) {
    if (lines[lines.length - 1] !== "") lines.push("");
    const subHeading = section.nummer != null ? `${section.nummer} ${section.titel}` : section.rawHeading;
    lines.push(`### ${subHeading}`, "");
    lines.push(...serializeBody(section.preamble, section.items, false));
  }

  // Trailing Leerzeile innerhalb des Blocks entfernen (Blöcke werden mit "\n\n" verbunden).
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

function serializeBody(preamble: string[], items: ChecklistItem[], maengelAnchor: boolean): string[] {
  const lines: string[] = [];
  for (const p of preamble) lines.push(p);
  if (preamble.length && (maengelAnchor || items.length)) lines.push("");
  if (maengelAnchor) {
    lines.push(ANCHOR_LINE);
    if (items.length) lines.push("");
  }
  for (const item of items) lines.push(...serializeItem(item, 0));
  return lines;
}

function serializeItem(item: ChecklistItem, level: number): string[] {
  const indent = "  ".repeat(level);
  const metaIndent = `${indent}  `;
  const checkbox = STATUS_TO_CHECKBOX[item.status];
  const lines = [`${indent}- [${checkbox}] ${item.text}`];

  const hasMeta =
    item.status !== "offen" ||
    item.kommentar.trim() !== "" ||
    item.frist !== null ||
    Object.keys(item.extra).length > 0;
  if (hasMeta) {
    lines.push(`${metaIndent}- Status: ${STATUS_LABEL[item.status]}`);
    if (item.status === "mangel" && item.schweregrad) {
      lines.push(`${metaIndent}- Schweregrad: ${item.schweregrad}`);
    }
    if (item.frist) {
      lines.push(`${metaIndent}- Frist: ${item.frist}`);
    }
    if (item.kommentar.trim() !== "") {
      lines.push(...serializeMultilineField(metaIndent, "Kommentar", item.kommentar));
    }
    for (const [key, value] of Object.entries(item.extra)) {
      lines.push(...serializeMultilineField(metaIndent, key, value));
    }
  }

  for (const child of item.children) {
    lines.push(...serializeItem(child, level + 1));
  }
  return lines;
}

function serializeMultilineField(indent: string, label: string, value: string): string[] {
  const parts = value.split("\n");
  const lines = [`${indent}- ${label}: ${parts[0]}`];
  for (let k = 1; k < parts.length; k++) {
    lines.push(`${indent}  ${parts[k]}`);
  }
  return lines;
}
