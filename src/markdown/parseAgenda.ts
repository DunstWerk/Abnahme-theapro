import type {
  AgendaDocument,
  ChecklistItem,
  Feststellung,
  ParseWarning,
  Top,
  Teilnehmer,
  Unterschrift,
  Verjaehrungsfrist,
} from "../types/agenda";
import { createEmptyAgenda, createEmptyItem, createEmptyFeststellung, createEmptyUnterschrift, createEmptyVerjaehrungsfrist } from "../types/agenda";
import {
  ANCHOR_RE,
  CHECKBOX_TO_STATUS,
  CURRENT_FORMAT_VERSION,
  FORMAT_LINE_RE,
  FRONT_MATTER_DELIM_RE,
  HEADER_BULLET_RE,
  ITEM_RE,
  META_RE,
  SUBSECTION_TITLE_RE,
  SUB_HEADING_RE,
  TABLE_ROW_RE,
  TABLE_SEP_RE,
  TITLE_RE,
  TOP_LEVEL_HEADING_RE,
  TOP_TITLE_RE,
  isReservedSection,
  matchErgebnisLabel,
  matchHeaderLabel,
  RECHTSGRUNDLAGE_LABEL,
  splitTableRow,
} from "./dialect";
import {
  normalizeDate,
  normalizeErgebnis,
  normalizeJaNein,
  normalizeSchweregrad,
  normalizeStatus,
  normalizeTermintreue,
} from "./normalize";

interface Line {
  text: string;
  no: number; // 1-basiert, für Warnungen
}

function toLines(raw: string): Line[] {
  const normalized = raw.replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\t/g, "  ");
  return normalized.split("\n").map((text, idx) => ({ text, no: idx + 1 }));
}

function leadingSpaces(s: string): number {
  const m = /^ */.exec(s);
  return m ? m[0].length : 0;
}

export function parseAgenda(raw: string): AgendaDocument {
  const lines = toLines(raw);
  const warnings: ParseWarning[] = [];
  let i = 0;
  let formatVersion = CURRENT_FORMAT_VERSION;

  // Optionaler Front-Matter-Block
  if (lines[i] && FRONT_MATTER_DELIM_RE.test(lines[i].text)) {
    let j = i + 1;
    while (j < lines.length && !FRONT_MATTER_DELIM_RE.test(lines[j].text)) j++;
    if (j < lines.length) {
      for (let k = i + 1; k < j; k++) {
        const m = FORMAT_LINE_RE.exec(lines[k].text.trim());
        if (m) formatVersion = Number(m[1]);
      }
      i = j + 1;
    } else {
      warnings.push({ line: lines[i].no, message: "Front-Matter-Block nicht geschlossen – wird ignoriert.", severity: "warn" });
    }
  }

  i = skipBlank(lines, i);

  const doc = createEmptyAgenda();
  doc.formatVersion = formatVersion;

  const titleMatch = lines[i] ? TITLE_RE.exec(lines[i].text) : null;
  if (titleMatch) {
    doc.titel = titleMatch[1].trim();
    i++;
  } else {
    warnings.push({ line: lines[i]?.no ?? 0, message: "Kein Dokumenttitel (# …) gefunden – Standardtitel wird verwendet.", severity: "warn" });
  }

  i = skipBlank(lines, i);

  while (i < lines.length) {
    i = skipBlank(lines, i);
    if (i >= lines.length) break;

    const headingMatch = TOP_LEVEL_HEADING_RE.exec(lines[i].text);
    if (!headingMatch) {
      if (lines[i].text.trim() !== "") {
        warnings.push({ line: lines[i].no, message: `Unerwartete Zeile außerhalb einer Sektion ignoriert: "${lines[i].text.trim()}"`, severity: "warn" });
      }
      i++;
      continue;
    }

    const headingText = headingMatch[1];
    i++;
    const { content, nextIndex } = sliceBlock(lines, i);
    i = nextIndex;

    const reserved = isReservedSection(headingText);
    if (reserved === "rahmendaten") {
      parseRahmendaten(content, doc, warnings);
    } else if (reserved === "teilnehmer") {
      doc.teilnehmer = parseTeilnehmer(content, warnings);
    } else if (reserved === "hinweis") {
      doc.hinweis = joinFreitext(content);
    } else if (reserved === "schlusshinweis") {
      doc.schlussHinweis = joinFreitext(content);
    } else if (reserved === "abnahmeergebnis") {
      parseAbnahmeergebnis(content, doc, warnings);
    } else if (reserved === "verjaehrung") {
      doc.niederschrift.verjaehrung = parseVerjaehrungTable(content, warnings);
    } else if (reserved === "verjaehrungWartung") {
      parseVerjaehrungWartung(content, doc, warnings);
    } else if (reserved === "sonstiges") {
      doc.niederschrift.sonstiges = joinFreitext(content);
    } else if (reserved === "unterschriften") {
      doc.niederschrift.unterschriften = parseUnterschriften(content, warnings);
    } else if (reserved === "feststellungen") {
      doc.feststellungen = parseFeststellungen(content, warnings);
    } else {
      doc.tops.push(parseTop(headingText, content, warnings));
    }
  }

  doc.warnings = warnings;
  return doc;
}

function skipBlank(lines: Line[], start: number): number {
  let i = start;
  while (i < lines.length && lines[i].text.trim() === "") i++;
  return i;
}

/** Sammelt Zeilen bis zur nächsten "## "-Überschrift (oder EOF). "### " gehört noch zum Block. */
function sliceBlock(lines: Line[], start: number): { content: Line[]; nextIndex: number } {
  let i = start;
  const content: Line[] = [];
  while (i < lines.length && !TOP_LEVEL_HEADING_RE.test(lines[i].text)) {
    content.push(lines[i]);
    i++;
  }
  return { content, nextIndex: i };
}

function joinFreitext(lines: Line[]): string {
  const trimmedLines = lines.map((l) => l.text);
  // Führende/folgende Leerzeilen abschneiden, interne Struktur erhalten.
  while (trimmedLines.length && trimmedLines[0].trim() === "") trimmedLines.shift();
  while (trimmedLines.length && trimmedLines[trimmedLines.length - 1].trim() === "") trimmedLines.pop();
  return trimmedLines.join("\n").trim();
}

function parseRahmendaten(lines: Line[], doc: AgendaDocument, warnings: ParseWarning[]): void {
  for (const line of lines) {
    if (line.text.trim() === "") continue;
    const m = HEADER_BULLET_RE.exec(line.text);
    if (!m) {
      warnings.push({ line: line.no, message: `Unerwartete Zeile in Rahmendaten ignoriert: "${line.text.trim()}"`, severity: "warn" });
      continue;
    }
    const label = m[1].trim();
    const value = m[2].trim();
    if (label.toLowerCase() === RECHTSGRUNDLAGE_LABEL.toLowerCase()) {
      doc.oenorm = normalizeJaNein(value);
      continue;
    }
    const field = matchHeaderLabel(label);
    if (field) {
      doc.header[field] = value;
    } else {
      doc.header.weitere[label] = value;
    }
  }
}

function parseTeilnehmer(lines: Line[], warnings: ParseWarning[]): Teilnehmer[] {
  const rows = lines.filter((l) => TABLE_ROW_RE.test(l.text) || TABLE_SEP_RE.test(l.text.trim()));
  if (rows.length === 0) return [];

  const dataRows = rows.filter((l) => !TABLE_SEP_RE.test(l.text.trim())).slice(1); // erste Zeile = Header, überspringen
  const teilnehmer: Teilnehmer[] = [];
  for (const row of dataRows) {
    const m = TABLE_ROW_RE.exec(row.text);
    if (!m) {
      warnings.push({ line: row.no, message: `Teilnehmer-Zeile konnte nicht gelesen werden: "${row.text.trim()}"`, severity: "warn" });
      continue;
    }
    const cells = m[1].split("|").map((c) => c.trim());
    if (cells.every((c) => c === "")) continue;
    teilnehmer.push({
      uid: crypto.randomUUID(),
      name: cells[0] ?? "",
      firmaFunktion: cells[1] ?? "",
      rolle: cells[2] ?? "",
    });
  }
  return teilnehmer;
}

/** Liest die Datenzeilen einer GFM-Tabelle (erste Zeile = Header wird übersprungen, Escaping via splitTableRow). */
function readTableRows(lines: Line[], warnings: ParseWarning[], context: string): string[][] {
  const rows = lines.filter((l) => TABLE_ROW_RE.test(l.text) || TABLE_SEP_RE.test(l.text.trim()));
  if (rows.length === 0) return [];

  const dataRows = rows.filter((l) => !TABLE_SEP_RE.test(l.text.trim())).slice(1);
  const result: string[][] = [];
  for (const row of dataRows) {
    const m = TABLE_ROW_RE.exec(row.text);
    if (!m) {
      warnings.push({ line: row.no, message: `${context}-Zeile konnte nicht gelesen werden: "${row.text.trim()}"`, severity: "warn" });
      continue;
    }
    const cells = splitTableRow(m[1]);
    if (cells.every((c) => c === "")) continue;
    result.push(cells);
  }
  return result;
}

function parseAbnahmeergebnis(lines: Line[], doc: AgendaDocument, warnings: ParseWarning[]): void {
  for (const line of lines) {
    if (line.text.trim() === "") continue;
    const m = HEADER_BULLET_RE.exec(line.text);
    if (!m) {
      warnings.push({ line: line.no, message: `Unerwartete Zeile in Abnahmeergebnis ignoriert: "${line.text.trim()}"`, severity: "warn" });
      continue;
    }
    const label = m[1].trim();
    const value = m[2].trim();
    const field = matchErgebnisLabel(label);
    if (field === "ergebnis") {
      const v = normalizeErgebnis(value);
      if (value !== "" && !v) {
        warnings.push({ line: line.no, message: `Unbekanntes Ergebnis "${value}" ignoriert.`, severity: "warn" });
      }
      doc.niederschrift.ergebnis = v;
    } else if (field === "maengelbeseitigungFrist") {
      if (value === "") {
        doc.niederschrift.maengelbeseitigungFrist = null;
      } else {
        const d = normalizeDate(value);
        if (d) {
          doc.niederschrift.maengelbeseitigungFrist = d;
        } else {
          warnings.push({ line: line.no, message: `Unlesbares Datum "${value}" bei Frist zur Mängelbeseitigung ignoriert.`, severity: "warn" });
        }
      }
    } else if (field === "fristAngemessen") {
      doc.niederschrift.fristAngemessen = normalizeJaNein(value);
    } else if (field === "termintreue") {
      const v = normalizeTermintreue(value);
      if (value !== "" && !v) {
        warnings.push({ line: line.no, message: `Unbekannte Fertigstellung "${value}" ignoriert.`, severity: "warn" });
      }
      doc.niederschrift.termintreue = v;
    } else {
      doc.niederschrift.weitere[label] = value;
    }
  }
}

function parseVerjaehrungTable(lines: Line[], warnings: ParseWarning[]): Verjaehrungsfrist[] {
  return readTableRows(lines, warnings, "Verjährungsfrist").map((cells) => ({
    ...createEmptyVerjaehrungsfrist(),
    nr: cells[0] ?? "",
    anlagenteil: cells[1] ?? "",
    beginn: cells[2] ?? "",
    ende: cells[3] ?? "",
  }));
}

function parseVerjaehrungWartung(lines: Line[], doc: AgendaDocument, warnings: ParseWarning[]): void {
  for (const line of lines) {
    if (line.text.trim() === "") continue;
    const m = HEADER_BULLET_RE.exec(line.text);
    if (m && m[1].trim().toLowerCase().includes("nr")) {
      doc.niederschrift.wartungsvertragNr = m[2].trim();
    }
  }
  doc.niederschrift.verjaehrungWartung = parseVerjaehrungTable(lines, warnings);
}

function parseUnterschriften(lines: Line[], warnings: ParseWarning[]): Unterschrift[] {
  return readTableRows(lines, warnings, "Unterschrift").map((cells) => ({
    ...createEmptyUnterschrift(),
    name: cells[0] ?? "",
    funktion: cells[1] ?? "",
  }));
}

function parseFeststellungen(lines: Line[], warnings: ParseWarning[]): Feststellung[] {
  return readTableRows(lines, warnings, "Feststellung").map((cells) => {
    const fristRaw = (cells[3] ?? "").trim();
    let frist: string | null = null;
    if (fristRaw !== "") {
      const d = normalizeDate(fristRaw);
      if (d) {
        frist = d;
      } else {
        warnings.push({ line: 0, message: `Unlesbares Datum "${fristRaw}" bei Feststellung ignoriert.`, severity: "warn" });
      }
    }
    return {
      ...createEmptyFeststellung(),
      bezeichnung: cells[0] ?? "",
      beschreibung: cells[1] ?? "",
      zustaendig: cells[2] ?? "",
      frist,
    };
  });
}

function parseTop(headingText: string, content: Line[], warnings: ParseWarning[]): Top {
  const titleMatch = TOP_TITLE_RE.exec(headingText);
  const top: Top = {
    uid: crypto.randomUUID(),
    rawHeading: headingText,
    nummer: titleMatch ? titleMatch[1] : null,
    titel: titleMatch ? titleMatch[2].trim() : headingText,
    preamble: [],
    items: [],
    sections: [],
    maengelAnchor: false,
  };

  // In Vor-Segment (vor der ersten "###") und Subsection-Segmente aufteilen.
  let cursor = 0;
  const preSegment: Line[] = [];
  while (cursor < content.length && !SUB_HEADING_RE.test(content[cursor].text)) {
    preSegment.push(content[cursor]);
    cursor++;
  }
  const preParsed = parseItemsAndPreamble(preSegment, warnings);
  top.preamble = preParsed.preamble;
  top.items = preParsed.items;
  let anyAnchor = preParsed.maengelAnchor;

  while (cursor < content.length) {
    const headingLine = content[cursor];
    const subHeadingMatch = SUB_HEADING_RE.exec(headingLine.text);
    if (!subHeadingMatch) {
      cursor++;
      continue;
    }
    cursor++;
    const segment: Line[] = [];
    while (cursor < content.length && !SUB_HEADING_RE.test(content[cursor].text)) {
      segment.push(content[cursor]);
      cursor++;
    }
    const subHeadingText = subHeadingMatch[1];
    const subTitleMatch = SUBSECTION_TITLE_RE.exec(subHeadingText);
    const parsedSeg = parseItemsAndPreamble(segment, warnings);
    anyAnchor = anyAnchor || parsedSeg.maengelAnchor;
    top.sections.push({
      uid: crypto.randomUUID(),
      rawHeading: subHeadingText,
      nummer: subTitleMatch ? subTitleMatch[1] : null,
      titel: subTitleMatch ? subTitleMatch[2].trim() : subHeadingText,
      preamble: parsedSeg.preamble,
      items: parsedSeg.items,
    });
  }

  top.maengelAnchor = anyAnchor;
  return top;
}

interface StackEntry {
  item: ChecklistItem;
  indent: number;
}

interface FieldTarget {
  item: ChecklistItem;
  key: "kommentar" | string;
  indent: number;
}

function parseItemsAndPreamble(
  lines: Line[],
  warnings: ParseWarning[],
): { preamble: string[]; items: ChecklistItem[]; maengelAnchor: boolean } {
  const preamble: string[] = [];
  const items: ChecklistItem[] = [];
  const stack: StackEntry[] = [];
  let lastFieldTarget: FieldTarget | null = null;
  let maengelAnchor = false;

  for (const line of lines) {
    if (line.text.trim() === "") {
      lastFieldTarget = null;
      continue;
    }
    const indent = leadingSpaces(line.text);
    const trimmed = line.text.trim();

    if (ANCHOR_RE.test(trimmed)) {
      maengelAnchor = true;
      lastFieldTarget = null;
      continue;
    }

    const itemMatch = ITEM_RE.exec(line.text);
    if (itemMatch) {
      const [, , marker, text] = itemMatch;
      const status = CHECKBOX_TO_STATUS[marker] ?? "offen";
      const newItem = createEmptyItem(text.trim());
      newItem.status = status;
      while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
      if (stack.length) {
        stack[stack.length - 1].item.children.push(newItem);
      } else {
        items.push(newItem);
      }
      stack.push({ item: newItem, indent });
      lastFieldTarget = null;
      continue;
    }

    const metaMatch = META_RE.exec(line.text);
    if (metaMatch) {
      const [, , rawKey, rawValue] = metaMatch;
      while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
      if (!stack.length) {
        warnings.push({ line: line.no, message: `Metadaten-Zeile ohne zugehörigen Punkt ignoriert: "${trimmed}"`, severity: "warn" });
        continue;
      }
      const owner = stack[stack.length - 1].item;
      const continuationKey = applyMetaField(owner, rawKey, rawValue.trim(), warnings, line.no);
      lastFieldTarget = continuationKey ? { item: owner, key: continuationKey, indent } : null;
      continue;
    }

    if (lastFieldTarget && indent > lastFieldTarget.indent) {
      appendContinuation(lastFieldTarget.item, lastFieldTarget.key, trimmed);
      continue;
    }

    if (items.length === 0 && stack.length === 0) {
      preamble.push(trimmed);
    } else {
      warnings.push({ line: line.no, message: `Unerwartete Zeile ignoriert: "${trimmed}"`, severity: "warn" });
    }
  }

  return { preamble, items, maengelAnchor };
}

function applyMetaField(
  item: ChecklistItem,
  rawKey: string,
  value: string,
  warnings: ParseWarning[],
  lineNo: number,
): "kommentar" | string | null {
  const key = rawKey.trim().toLowerCase();
  if (key === "status") {
    const st = normalizeStatus(value);
    if (st) {
      item.status = st;
    } else {
      warnings.push({ line: lineNo, message: `Unbekannter Status "${value}" ignoriert.`, severity: "warn" });
    }
    return null;
  }
  if (key === "schweregrad") {
    const sg = normalizeSchweregrad(value);
    if (value.trim() !== "" && !sg) {
      warnings.push({ line: lineNo, message: `Unbekannter Schweregrad "${value}" ignoriert.`, severity: "warn" });
    }
    item.schweregrad = sg;
    return null;
  }
  if (key === "frist") {
    if (value.trim() === "") {
      item.frist = null;
    } else {
      const d = normalizeDate(value);
      if (d) {
        item.frist = d;
      } else {
        warnings.push({ line: lineNo, message: `Unlesbares Datum "${value}" bei Frist ignoriert.`, severity: "warn" });
      }
    }
    return null;
  }
  if (key === "kommentar") {
    item.kommentar = value;
    return "kommentar";
  }
  const extraKey = rawKey.trim();
  item.extra[extraKey] = value;
  return extraKey;
}

function appendContinuation(item: ChecklistItem, key: "kommentar" | string, text: string): void {
  if (key === "kommentar") {
    item.kommentar = item.kommentar ? `${item.kommentar}\n${text}` : text;
  } else {
    item.extra[key] = item.extra[key] ? `${item.extra[key]}\n${text}` : text;
  }
}
