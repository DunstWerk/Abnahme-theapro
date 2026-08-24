import { create } from "zustand";
import type {
  AgendaDocument,
  AgendaHeader,
  ChecklistItem,
  Feststellung,
  ItemStatus,
  Niederschrift,
  ParseWarning,
  Schweregrad,
  SubSection,
  Teilnehmer,
  Top,
  Unterschrift,
  Verjaehrungsfrist,
} from "../types/agenda";
import {
  DEFAULT_ITEM_TEXT,
  DEFAULT_SECTION_TITEL,
  DEFAULT_TOP_TITEL,
  createEmptyAgenda,
  createEmptyFeststellung,
  createEmptyItem,
  createEmptySubSection,
  createEmptyTop,
  createEmptyUnterschrift,
  createEmptyVerjaehrungsfrist,
  formatSectionHeading,
  formatTopHeading,
} from "../types/agenda";
import { parseAgenda } from "../markdown/parseAgenda";
import { serializeAgenda } from "../markdown/serializeAgenda";
import { backupCurrent, loadPersisted, loadPrefs, savePrefs, scheduleSave } from "./persistence";
import type { ItemFilter } from "./selectors";
import vorlageGoettingen from "../templates/vorlage-goettingen.md?raw";

function mapItemsTree(items: ChecklistItem[], uid: string, fn: (item: ChecklistItem) => ChecklistItem): ChecklistItem[] {
  let changed = false;
  const next = items.map((it) => {
    if (it.uid === uid) {
      changed = true;
      return fn(it);
    }
    if (it.children.length) {
      const newChildren = mapItemsTree(it.children, uid, fn);
      if (newChildren !== it.children) {
        changed = true;
        return { ...it, children: newChildren };
      }
    }
    return it;
  });
  return changed ? next : items;
}

function updateItemInDoc(doc: AgendaDocument, uid: string, fn: (item: ChecklistItem) => ChecklistItem): AgendaDocument {
  let changed = false;
  const newTops = doc.tops.map((top) => {
    const newItems = mapItemsTree(top.items, uid, fn);
    const newSections = top.sections.map((sec) => {
      const newSecItems = mapItemsTree(sec.items, uid, fn);
      if (newSecItems !== sec.items) {
        changed = true;
        return { ...sec, items: newSecItems };
      }
      return sec;
    });
    const itemsChanged = newItems !== top.items;
    const sectionsChanged = newSections.some((s, idx) => s !== top.sections[idx]);
    if (itemsChanged) changed = true;
    if (itemsChanged || sectionsChanged) {
      return { ...top, items: newItems, sections: newSections };
    }
    return top;
  });
  if (!changed) return doc;
  return { ...doc, tops: newTops };
}

function moveInArray<T>(arr: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (index < 0 || target < 0 || target >= arr.length) return arr;
  const next = [...arr];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Verschiebt das Element an fromIndex an eine beliebige Zielposition (für Drag & Drop; die
 * ▲▼-Buttons nutzen weiterhin moveInArray). targetIndex bezieht sich auf die Liste NACH dem
 * Herausnehmen des Elements (0..arr.length ist gültig, arr.length = Einfügen ans Ende). */
function moveToIndex<T>(arr: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex < 0 || fromIndex >= arr.length) return arr;
  const next = [...arr];
  const [item] = next.splice(fromIndex, 1);
  const clamped = Math.max(0, Math.min(toIndex, next.length));
  next.splice(clamped, 0, item);
  return next;
}

/** Weist allen TOPs fortlaufende Nummern 1..N zu – im Bearbeitungsmodus ist die TOP-Nummer nie
 * manuell gesetzt, sondern ergibt sich immer aus der Reihenfolge. Zieht bestehende
 * Abschnittsnummern mit, wenn sie das alte TOP-Nummer-Präfix tragen (z.B. "2.1" -> "3.1"), damit
 * keine inkonsistente Anzeige wie "TOP 3" mit Abschnitt "2.1" darunter entsteht. */
function renumberTops(tops: Top[]): Top[] {
  return tops.map((top, idx) => {
    const nummer = String(idx + 1);
    if (top.nummer === nummer) return top;
    const oldPrefix = top.nummer != null ? `${top.nummer}.` : null;
    const sections = oldPrefix
      ? top.sections.map((sec) => {
          if (sec.nummer == null || !sec.nummer.startsWith(oldPrefix)) return sec;
          const secNummer = `${nummer}.${sec.nummer.slice(oldPrefix.length)}`;
          return { ...sec, nummer: secNummer, rawHeading: formatSectionHeading(secNummer, sec.titel) };
        })
      : top.sections;
    return { ...top, nummer, sections, rawHeading: formatTopHeading(nummer, top.titel) };
  });
}

/** Ersetzt genau ein TOP per uid, immutabel mit struktureller Teilung (unbeteiligte
 * TOPs behalten ihre Objektreferenz, damit React.memo sie nicht neu rendert). */
function withTop(doc: AgendaDocument, topUid: string, fn: (top: Top) => Top): AgendaDocument {
  let changed = false;
  const newTops = doc.tops.map((top) => {
    if (top.uid !== topUid) return top;
    const next = fn(top);
    if (next !== top) changed = true;
    return next;
  });
  if (!changed) return doc;
  return { ...doc, tops: newTops };
}

function withSection(
  doc: AgendaDocument,
  topUid: string,
  sectionUid: string,
  fn: (sec: SubSection) => SubSection,
): AgendaDocument {
  return withTop(doc, topUid, (top) => {
    let changed = false;
    const newSections = top.sections.map((sec) => {
      if (sec.uid !== sectionUid) return sec;
      const next = fn(sec);
      if (next !== sec) changed = true;
      return next;
    });
    return changed ? { ...top, sections: newSections } : top;
  });
}

/** sectionUid === null -> Items direkt am TOP; sonst Items des jeweiligen Abschnitts. */
function withItems(
  doc: AgendaDocument,
  topUid: string,
  sectionUid: string | null,
  fn: (items: ChecklistItem[]) => ChecklistItem[],
): AgendaDocument {
  if (sectionUid === null) {
    return withTop(doc, topUid, (top) => {
      const newItems = fn(top.items);
      return newItems !== top.items ? { ...top, items: newItems } : top;
    });
  }
  return withSection(doc, topUid, sectionUid, (sec) => {
    const newItems = fn(sec.items);
    return newItems !== sec.items ? { ...sec, items: newItems } : sec;
  });
}

export type VerjaehrungListe = "verjaehrung" | "verjaehrungWartung";
type NiederschriftScalarField = "ergebnis" | "maengelbeseitigungFrist" | "fristAngemessen" | "termintreue" | "sonstiges" | "wartungsvertragNr";

interface UiState {
  collapsedTops: Set<string>;
  filter: ItemFilter;
  /** Transient, nie persistiert – Bearbeitungsmodus ist nach jedem Laden der App aus. */
  editMode: boolean;
  /** Transient – uid eines frisch angelegten TOP/Abschnitts/Punkts, der einmalig automatisch fokussiert werden soll. */
  focusUid: string | null;
}

interface AgendaState {
  doc: AgendaDocument;
  lastSavedAt: string | null;
  dirtySinceExport: boolean;
  importWarnings: ParseWarning[];
  ui: UiState;
  /** Dauerhafte, session-übergreifende App-Einstellung (siehe state/persistence.ts). */
  prefs: { skipDeleteConfirm: boolean };

  setItemStatus: (uid: string, status: ItemStatus) => void;
  setItemKommentar: (uid: string, text: string) => void;
  setItemSchweregrad: (uid: string, sg: Schweregrad | null) => void;
  setItemFrist: (uid: string, date: string | null) => void;

  setHeaderField: (field: keyof Omit<AgendaHeader, "weitere">, value: string) => void;
  setHinweis: (text: string) => void;
  setSchlussHinweis: (text: string) => void;
  setTitel: (text: string) => void;
  setOenorm: (value: boolean) => void;
  setUebernahmeBezeichnung: (value: string) => void;

  addTeilnehmer: () => void;
  updateTeilnehmer: (uid: string, patch: Partial<Omit<Teilnehmer, "uid">>) => void;
  removeTeilnehmer: (uid: string) => void;

  setNiederschriftField: <K extends NiederschriftScalarField>(field: K, value: Niederschrift[K]) => void;

  addVerjaehrung: (liste: VerjaehrungListe) => void;
  updateVerjaehrung: (liste: VerjaehrungListe, uid: string, patch: Partial<Omit<Verjaehrungsfrist, "uid">>) => void;
  removeVerjaehrung: (liste: VerjaehrungListe, uid: string) => void;

  addUnterschrift: () => void;
  updateUnterschrift: (uid: string, patch: Partial<Omit<Unterschrift, "uid">>) => void;
  removeUnterschrift: (uid: string) => void;

  addFeststellung: () => void;
  updateFeststellung: (uid: string, patch: Partial<Omit<Feststellung, "uid">>) => void;
  removeFeststellung: (uid: string) => void;

  setEditMode: (on: boolean) => void;
  clearFocus: (uid: string) => void;
  setSkipDeleteConfirm: (value: boolean) => void;

  /** beforeTopUid gesetzt -> neues TOP wird direkt davor eingefügt; sonst ans Ende angehängt.
   * TOP-Nummern werden danach immer automatisch neu 1..N durchnummeriert. */
  addTop: (beforeTopUid?: string) => void;
  removeTop: (topUid: string) => void;
  moveTop: (topUid: string, delta: -1 | 1) => void;
  reorderTop: (topUid: string, targetIndex: number) => void;
  /** Nummer ist nicht mehr manuell setzbar (siehe renumberTops) – nur noch der Titel. */
  updateTop: (topUid: string, titel: string) => void;

  addSection: (topUid: string) => void;
  removeSection: (topUid: string, sectionUid: string) => void;
  moveSection: (topUid: string, sectionUid: string, delta: -1 | 1) => void;
  reorderSection: (topUid: string, sectionUid: string, targetIndex: number) => void;
  updateSection: (topUid: string, sectionUid: string, patch: { nummer?: string; titel?: string }) => void;

  addItem: (topUid: string, sectionUid: string | null) => void;
  removeItem: (topUid: string, sectionUid: string | null, itemUid: string) => void;
  moveItem: (topUid: string, sectionUid: string | null, itemUid: string, delta: -1 | 1) => void;
  reorderItem: (topUid: string, sectionUid: string | null, itemUid: string, targetIndex: number) => void;
  setItemText: (uid: string, text: string) => void;

  toggleTopCollapsed: (uid: string) => void;
  setFilter: (filter: ItemFilter) => void;

  loadFromMarkdown: (raw: string) => ParseWarning[];
  loadTemplate: () => void;
  reset: () => void;
  markExported: () => void;
  dismissImportWarnings: () => void;
}

function persistedStateFor(doc: AgendaDocument, ui: UiState) {
  return {
    schemaVersion: 1 as const,
    savedAt: new Date().toISOString(),
    markdown: serializeAgenda(doc),
    ui: { collapsedTops: Array.from(ui.collapsedTops), filter: ui.filter },
  };
}

function initialDocument(): { doc: AgendaDocument; ui: UiState } {
  const persisted = loadPersisted();
  if (persisted?.markdown) {
    try {
      const doc = parseAgenda(persisted.markdown);
      return {
        doc,
        ui: {
          collapsedTops: new Set(persisted.ui?.collapsedTops ?? []),
          filter: (persisted.ui?.filter as ItemFilter) ?? "alle",
          editMode: false,
          focusUid: null,
        },
      };
    } catch {
      // fällt durch auf Vorlage
    }
  }
  return { doc: parseAgenda(vorlageGoettingen), ui: { collapsedTops: new Set(), filter: "alle", editMode: false, focusUid: null } };
}

export const useAgendaStore = create<AgendaState>((set, get) => {
  const { doc: initialDoc, ui: initialUi } = initialDocument();

  function afterChange(doc: AgendaDocument) {
    const ui = get().ui;
    scheduleSave(persistedStateFor(doc, ui));
  }

  return {
    doc: initialDoc,
    lastSavedAt: null,
    dirtySinceExport: false,
    importWarnings: initialDoc.warnings,
    ui: initialUi,
    prefs: loadPrefs(),

    setItemStatus: (uid, status) =>
      set((state) => {
        const doc = updateItemInDoc(state.doc, uid, (item) => ({ ...item, status }));
        afterChange(doc);
        return { doc, dirtySinceExport: true };
      }),

    setItemKommentar: (uid, text) =>
      set((state) => {
        const doc = updateItemInDoc(state.doc, uid, (item) => ({ ...item, kommentar: text }));
        afterChange(doc);
        return { doc, dirtySinceExport: true };
      }),

    setItemSchweregrad: (uid, sg) =>
      set((state) => {
        const doc = updateItemInDoc(state.doc, uid, (item) => ({ ...item, schweregrad: sg }));
        afterChange(doc);
        return { doc, dirtySinceExport: true };
      }),

    setItemFrist: (uid, date) =>
      set((state) => {
        const doc = updateItemInDoc(state.doc, uid, (item) => ({ ...item, frist: date }));
        afterChange(doc);
        return { doc, dirtySinceExport: true };
      }),

    setHeaderField: (field, value) =>
      set((state) => {
        const doc = { ...state.doc, header: { ...state.doc.header, [field]: value } };
        afterChange(doc);
        return { doc, dirtySinceExport: true };
      }),

    setHinweis: (text) =>
      set((state) => {
        const doc = { ...state.doc, hinweis: text };
        afterChange(doc);
        return { doc, dirtySinceExport: true };
      }),

    setSchlussHinweis: (text) =>
      set((state) => {
        const doc = { ...state.doc, schlussHinweis: text };
        afterChange(doc);
        return { doc, dirtySinceExport: true };
      }),

    setTitel: (text) =>
      set((state) => {
        const doc = { ...state.doc, titel: text };
        afterChange(doc);
        return { doc, dirtySinceExport: true };
      }),

    setOenorm: (value) =>
      set((state) => {
        const doc = { ...state.doc, oenorm: value };
        afterChange(doc);
        return { doc, dirtySinceExport: true };
      }),

    setUebernahmeBezeichnung: (value) =>
      set((state) => {
        const doc = { ...state.doc, uebernahmeBezeichnung: value };
        afterChange(doc);
        return { doc, dirtySinceExport: true };
      }),

    addTeilnehmer: () =>
      set((state) => {
        const t: Teilnehmer = { uid: crypto.randomUUID(), name: "", firmaFunktion: "", rolle: "" };
        const doc = { ...state.doc, teilnehmer: [...state.doc.teilnehmer, t] };
        afterChange(doc);
        return { doc, dirtySinceExport: true };
      }),

    updateTeilnehmer: (uid, patch) =>
      set((state) => {
        const doc = {
          ...state.doc,
          teilnehmer: state.doc.teilnehmer.map((t) => (t.uid === uid ? { ...t, ...patch } : t)),
        };
        afterChange(doc);
        return { doc, dirtySinceExport: true };
      }),

    removeTeilnehmer: (uid) =>
      set((state) => {
        const doc = { ...state.doc, teilnehmer: state.doc.teilnehmer.filter((t) => t.uid !== uid) };
        afterChange(doc);
        return { doc, dirtySinceExport: true };
      }),

    setNiederschriftField: (field, value) =>
      set((state) => {
        const doc = { ...state.doc, niederschrift: { ...state.doc.niederschrift, [field]: value } };
        afterChange(doc);
        return { doc, dirtySinceExport: true };
      }),

    addVerjaehrung: (liste) =>
      set((state) => {
        const eintrag = createEmptyVerjaehrungsfrist();
        const doc = {
          ...state.doc,
          niederschrift: { ...state.doc.niederschrift, [liste]: [...state.doc.niederschrift[liste], eintrag] },
        };
        afterChange(doc);
        return { doc, dirtySinceExport: true };
      }),

    updateVerjaehrung: (liste, uid, patch) =>
      set((state) => {
        const doc = {
          ...state.doc,
          niederschrift: {
            ...state.doc.niederschrift,
            [liste]: state.doc.niederschrift[liste].map((v) => (v.uid === uid ? { ...v, ...patch } : v)),
          },
        };
        afterChange(doc);
        return { doc, dirtySinceExport: true };
      }),

    removeVerjaehrung: (liste, uid) =>
      set((state) => {
        const doc = {
          ...state.doc,
          niederschrift: {
            ...state.doc.niederschrift,
            [liste]: state.doc.niederschrift[liste].filter((v) => v.uid !== uid),
          },
        };
        afterChange(doc);
        return { doc, dirtySinceExport: true };
      }),

    addUnterschrift: () =>
      set((state) => {
        const doc = {
          ...state.doc,
          niederschrift: {
            ...state.doc.niederschrift,
            unterschriften: [...state.doc.niederschrift.unterschriften, createEmptyUnterschrift()],
          },
        };
        afterChange(doc);
        return { doc, dirtySinceExport: true };
      }),

    updateUnterschrift: (uid, patch) =>
      set((state) => {
        const doc = {
          ...state.doc,
          niederschrift: {
            ...state.doc.niederschrift,
            unterschriften: state.doc.niederschrift.unterschriften.map((u) => (u.uid === uid ? { ...u, ...patch } : u)),
          },
        };
        afterChange(doc);
        return { doc, dirtySinceExport: true };
      }),

    removeUnterschrift: (uid) =>
      set((state) => {
        const doc = {
          ...state.doc,
          niederschrift: {
            ...state.doc.niederschrift,
            unterschriften: state.doc.niederschrift.unterschriften.filter((u) => u.uid !== uid),
          },
        };
        afterChange(doc);
        return { doc, dirtySinceExport: true };
      }),

    addFeststellung: () =>
      set((state) => {
        const doc = { ...state.doc, feststellungen: [...state.doc.feststellungen, createEmptyFeststellung()] };
        afterChange(doc);
        return { doc, dirtySinceExport: true };
      }),

    updateFeststellung: (uid, patch) =>
      set((state) => {
        const doc = {
          ...state.doc,
          feststellungen: state.doc.feststellungen.map((f) => (f.uid === uid ? { ...f, ...patch } : f)),
        };
        afterChange(doc);
        return { doc, dirtySinceExport: true };
      }),

    removeFeststellung: (uid) =>
      set((state) => {
        const doc = { ...state.doc, feststellungen: state.doc.feststellungen.filter((f) => f.uid !== uid) };
        afterChange(doc);
        return { doc, dirtySinceExport: true };
      }),

    setEditMode: (on) =>
      set((state) => {
        const ui: UiState = { ...state.ui, editMode: on, focusUid: null, filter: on ? "alle" : state.ui.filter };
        scheduleSave(persistedStateFor(state.doc, ui));
        return { ui };
      }),

    clearFocus: (uid) =>
      set((state) => (state.ui.focusUid === uid ? { ui: { ...state.ui, focusUid: null } } : {})),

    setSkipDeleteConfirm: (value) =>
      set(() => {
        savePrefs({ skipDeleteConfirm: value });
        return { prefs: { skipDeleteConfirm: value } };
      }),

    addTop: (beforeTopUid) =>
      set((state) => {
        const top = createEmptyTop(null);
        const idx = beforeTopUid ? state.doc.tops.findIndex((t) => t.uid === beforeTopUid) : -1;
        const tops = renumberTops(
          idx === -1 ? [...state.doc.tops, top] : [...state.doc.tops.slice(0, idx), top, ...state.doc.tops.slice(idx)],
        );
        const doc = { ...state.doc, tops };
        afterChange(doc);
        return { doc, dirtySinceExport: true, ui: { ...state.ui, focusUid: top.uid } };
      }),

    removeTop: (topUid) =>
      set((state) => {
        const tops = renumberTops(state.doc.tops.filter((t) => t.uid !== topUid));
        const doc = { ...state.doc, tops };
        afterChange(doc);
        const collapsedTops = new Set(state.ui.collapsedTops);
        collapsedTops.delete(topUid);
        return { doc, dirtySinceExport: true, ui: { ...state.ui, collapsedTops } };
      }),

    moveTop: (topUid, delta) =>
      set((state) => {
        const index = state.doc.tops.findIndex((t) => t.uid === topUid);
        if (index === -1) return {};
        const moved = moveInArray(state.doc.tops, index, delta);
        if (moved === state.doc.tops) return {};
        const doc = { ...state.doc, tops: renumberTops(moved) };
        afterChange(doc);
        return { doc, dirtySinceExport: true };
      }),

    reorderTop: (topUid, targetIndex) =>
      set((state) => {
        const fromIndex = state.doc.tops.findIndex((t) => t.uid === topUid);
        if (fromIndex === -1) return {};
        const moved = moveToIndex(state.doc.tops, fromIndex, targetIndex);
        if (moved === state.doc.tops) return {};
        const doc = { ...state.doc, tops: renumberTops(moved) };
        afterChange(doc);
        return { doc, dirtySinceExport: true };
      }),

    updateTop: (topUid, titel) =>
      set((state) => {
        const doc = withTop(state.doc, topUid, (top) => {
          const t = titel.trim() === "" ? DEFAULT_TOP_TITEL : titel.trim();
          if (t === top.titel) return top;
          return { ...top, titel: t, rawHeading: formatTopHeading(top.nummer, t) };
        });
        if (doc === state.doc) return {};
        afterChange(doc);
        return { doc, dirtySinceExport: true };
      }),

    addSection: (topUid) =>
      set((state) => {
        const top = state.doc.tops.find((t) => t.uid === topUid);
        if (!top) return {};
        const nummer = top.nummer != null ? `${top.nummer}.${top.sections.length + 1}` : String(top.sections.length + 1);
        const newSection = createEmptySubSection(nummer);
        const doc = withTop(state.doc, topUid, (t) => ({ ...t, sections: [...t.sections, newSection] }));
        afterChange(doc);
        const collapsedTops = new Set(state.ui.collapsedTops);
        collapsedTops.delete(topUid);
        return { doc, dirtySinceExport: true, ui: { ...state.ui, focusUid: newSection.uid, collapsedTops } };
      }),

    removeSection: (topUid, sectionUid) =>
      set((state) => {
        const doc = withTop(state.doc, topUid, (top) => ({
          ...top,
          sections: top.sections.filter((s) => s.uid !== sectionUid),
        }));
        if (doc === state.doc) return {};
        afterChange(doc);
        return { doc, dirtySinceExport: true };
      }),

    moveSection: (topUid, sectionUid, delta) =>
      set((state) => {
        const doc = withTop(state.doc, topUid, (top) => {
          const index = top.sections.findIndex((s) => s.uid === sectionUid);
          if (index === -1) return top;
          const sections = moveInArray(top.sections, index, delta);
          return sections === top.sections ? top : { ...top, sections };
        });
        if (doc === state.doc) return {};
        afterChange(doc);
        return { doc, dirtySinceExport: true };
      }),

    reorderSection: (topUid, sectionUid, targetIndex) =>
      set((state) => {
        const doc = withTop(state.doc, topUid, (top) => {
          const fromIndex = top.sections.findIndex((s) => s.uid === sectionUid);
          if (fromIndex === -1) return top;
          const sections = moveToIndex(top.sections, fromIndex, targetIndex);
          return sections === top.sections ? top : { ...top, sections };
        });
        if (doc === state.doc) return {};
        afterChange(doc);
        return { doc, dirtySinceExport: true };
      }),

    updateSection: (topUid, sectionUid, patch) =>
      set((state) => {
        const doc = withSection(state.doc, topUid, sectionUid, (sec) => {
          const nummer = patch.nummer !== undefined ? (patch.nummer.trim() === "" ? null : patch.nummer.trim()) : sec.nummer;
          const titel = patch.titel !== undefined ? (patch.titel.trim() === "" ? DEFAULT_SECTION_TITEL : patch.titel.trim()) : sec.titel;
          return { ...sec, nummer, titel, rawHeading: formatSectionHeading(nummer, titel) };
        });
        if (doc === state.doc) return {};
        afterChange(doc);
        return { doc, dirtySinceExport: true };
      }),

    addItem: (topUid, sectionUid) =>
      set((state) => {
        const item = createEmptyItem(DEFAULT_ITEM_TEXT);
        const doc = withItems(state.doc, topUid, sectionUid, (items) => [...items, item]);
        if (doc === state.doc) return {};
        afterChange(doc);
        const collapsedTops = new Set(state.ui.collapsedTops);
        collapsedTops.delete(topUid);
        return { doc, dirtySinceExport: true, ui: { ...state.ui, focusUid: item.uid, collapsedTops } };
      }),

    removeItem: (topUid, sectionUid, itemUid) =>
      set((state) => {
        const doc = withItems(state.doc, topUid, sectionUid, (items) => items.filter((i) => i.uid !== itemUid));
        if (doc === state.doc) return {};
        afterChange(doc);
        return { doc, dirtySinceExport: true };
      }),

    moveItem: (topUid, sectionUid, itemUid, delta) =>
      set((state) => {
        const doc = withItems(state.doc, topUid, sectionUid, (items) => {
          const index = items.findIndex((i) => i.uid === itemUid);
          if (index === -1) return items;
          return moveInArray(items, index, delta);
        });
        if (doc === state.doc) return {};
        afterChange(doc);
        return { doc, dirtySinceExport: true };
      }),

    reorderItem: (topUid, sectionUid, itemUid, targetIndex) =>
      set((state) => {
        const doc = withItems(state.doc, topUid, sectionUid, (items) => {
          const fromIndex = items.findIndex((i) => i.uid === itemUid);
          if (fromIndex === -1) return items;
          return moveToIndex(items, fromIndex, targetIndex);
        });
        if (doc === state.doc) return {};
        afterChange(doc);
        return { doc, dirtySinceExport: true };
      }),

    setItemText: (uid, text) =>
      set((state) => {
        const doc = updateItemInDoc(state.doc, uid, (item) => ({ ...item, text: text.trim() === "" ? DEFAULT_ITEM_TEXT : text }));
        afterChange(doc);
        return { doc, dirtySinceExport: true };
      }),

    toggleTopCollapsed: (uid) =>
      set((state) => {
        const collapsedTops = new Set(state.ui.collapsedTops);
        if (collapsedTops.has(uid)) collapsedTops.delete(uid);
        else collapsedTops.add(uid);
        const ui = { ...state.ui, collapsedTops };
        scheduleSave(persistedStateFor(state.doc, ui));
        return { ui };
      }),

    setFilter: (filter) =>
      set((state) => {
        const ui = { ...state.ui, filter };
        scheduleSave(persistedStateFor(state.doc, ui));
        return { ui };
      }),

    loadFromMarkdown: (raw) => {
      backupCurrent();
      const doc = parseAgenda(raw);
      set((state) => {
        afterChange(doc);
        return {
          doc,
          dirtySinceExport: false,
          importWarnings: doc.warnings,
          ui: { collapsedTops: new Set(), filter: "alle", editMode: state.ui.editMode, focusUid: null },
        };
      });
      return doc.warnings;
    },

    loadTemplate: () => {
      backupCurrent();
      const doc = parseAgenda(vorlageGoettingen);
      set((state) => {
        afterChange(doc);
        return {
          doc,
          dirtySinceExport: false,
          importWarnings: [],
          ui: { collapsedTops: new Set(), filter: "alle", editMode: state.ui.editMode, focusUid: null },
        };
      });
    },

    reset: () => {
      backupCurrent();
      const doc = createEmptyAgenda();
      set((state) => {
        afterChange(doc);
        return {
          doc,
          dirtySinceExport: false,
          importWarnings: [],
          ui: { collapsedTops: new Set(), filter: "alle", editMode: state.ui.editMode, focusUid: null },
        };
      });
    },

    markExported: () => set({ dirtySinceExport: false, lastSavedAt: new Date().toISOString() }),

    dismissImportWarnings: () => set({ importWarnings: [] }),
  };
});

export function serializeCurrentDocument(): string {
  return serializeAgenda(useAgendaStore.getState().doc);
}
