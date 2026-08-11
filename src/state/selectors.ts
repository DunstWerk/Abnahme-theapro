import type { AgendaDocument, ChecklistItem, MangelEntry, SubSection, Top } from "../types/agenda";

function truncate(text: string, max = 70): string {
  const clean = text.trim().replace(/\s+/g, " ");
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function walkMangelItems(
  items: ChecklistItem[],
  ortLabel: string,
  out: { item: ChecklistItem; ortLabel: string }[],
): void {
  for (const item of items) {
    if (item.status === "mangel") out.push({ item, ortLabel });
    if (item.children.length) walkMangelItems(item.children, ortLabel, out);
  }
}

/** Kompiliert die Mängelliste in Dokumentreihenfolge über alle TOPs/Subsections/Items hinweg. */
export function compileMaengel(doc: AgendaDocument): MangelEntry[] {
  const found: { item: ChecklistItem; ortLabel: string }[] = [];

  for (const top of doc.tops) {
    const topLabel = top.nummer != null ? `TOP ${top.nummer}` : top.titel;
    walkMangelItems(top.items, topLabel, found);
    for (const sec of top.sections) {
      const secLabel = sec.nummer != null ? `${topLabel} › ${sec.nummer} ${sec.titel}` : `${topLabel} › ${sec.titel}`;
      walkMangelItems(sec.items, secLabel, found);
    }
  }

  return found.map((f, idx) => ({
    nr: idx + 1,
    itemUid: f.item.uid,
    beschreibung: f.item.text,
    kommentar: f.item.kommentar,
    ortLabel: `${f.ortLabel} › ${truncate(f.item.text)}`,
    schweregrad: f.item.schweregrad,
    frist: f.item.frist,
  }));
}

export interface TopProgress {
  topUid: string;
  total: number;
  bearbeitet: number;
  mangelCount: number;
}

function countItems(items: ChecklistItem[]): { total: number; bearbeitet: number; mangelCount: number } {
  let total = 0;
  let bearbeitet = 0;
  let mangelCount = 0;
  for (const item of items) {
    total += 1;
    if (item.status !== "offen") bearbeitet += 1;
    if (item.status === "mangel") mangelCount += 1;
    if (item.children.length) {
      const sub = countItems(item.children);
      total += sub.total;
      bearbeitet += sub.bearbeitet;
      mangelCount += sub.mangelCount;
    }
  }
  return { total, bearbeitet, mangelCount };
}

export function computeTopProgress(top: Top): TopProgress {
  const own = countItems(top.items);
  let total = own.total;
  let bearbeitet = own.bearbeitet;
  let mangelCount = own.mangelCount;
  for (const sec of top.sections) {
    const s = countItems(sec.items);
    total += s.total;
    bearbeitet += s.bearbeitet;
    mangelCount += s.mangelCount;
  }
  return { topUid: top.uid, total, bearbeitet, mangelCount };
}

export function computeOverallProgress(doc: AgendaDocument): { total: number; bearbeitet: number; mangelCount: number } {
  let total = 0;
  let bearbeitet = 0;
  let mangelCount = 0;
  for (const top of doc.tops) {
    const p = computeTopProgress(top);
    total += p.total;
    bearbeitet += p.bearbeitet;
    mangelCount += p.mangelCount;
  }
  return { total, bearbeitet, mangelCount };
}

export type ItemFilter = "alle" | "offen" | "mangel";

function filterItems(items: ChecklistItem[], filter: ItemFilter): ChecklistItem[] {
  if (filter === "alle") return items;
  const result: ChecklistItem[] = [];
  for (const item of items) {
    const children = filterItems(item.children, filter);
    const selfMatches = filter === "offen" ? item.status === "offen" : item.status === "mangel";
    if (selfMatches || children.length) {
      result.push(children.length !== item.children.length ? { ...item, children } : item);
    }
  }
  return result;
}

export function filterSection(section: SubSection, filter: ItemFilter): SubSection {
  const items = filterItems(section.items, filter);
  return items !== section.items ? { ...section, items } : section;
}

export function filterTop(top: Top, filter: ItemFilter): Top {
  const items = filterItems(top.items, filter);
  const sections = top.sections.map((s) => filterSection(s, filter));
  return { ...top, items, sections };
}
