import { create } from "zustand";
import type {
  AgendaDocument,
  AgendaHeader,
  ChecklistItem,
  ItemStatus,
  ParseWarning,
  Schweregrad,
  Teilnehmer,
} from "../types/agenda";
import { createEmptyAgenda } from "../types/agenda";
import { parseAgenda } from "../markdown/parseAgenda";
import { serializeAgenda } from "../markdown/serializeAgenda";
import { backupCurrent, loadPersisted, scheduleSave } from "./persistence";
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

interface AgendaState {
  doc: AgendaDocument;
  lastSavedAt: string | null;
  dirtySinceExport: boolean;
  importWarnings: ParseWarning[];
  ui: { collapsedTops: Set<string>; filter: ItemFilter };

  setItemStatus: (uid: string, status: ItemStatus) => void;
  setItemKommentar: (uid: string, text: string) => void;
  setItemSchweregrad: (uid: string, sg: Schweregrad | null) => void;
  setItemFrist: (uid: string, date: string | null) => void;

  setHeaderField: (field: keyof Omit<AgendaHeader, "weitere">, value: string) => void;
  setHinweis: (text: string) => void;
  setSchlussHinweis: (text: string) => void;
  setTitel: (text: string) => void;

  addTeilnehmer: () => void;
  updateTeilnehmer: (uid: string, patch: Partial<Omit<Teilnehmer, "uid">>) => void;
  removeTeilnehmer: (uid: string) => void;

  toggleTopCollapsed: (uid: string) => void;
  setFilter: (filter: ItemFilter) => void;

  loadFromMarkdown: (raw: string) => ParseWarning[];
  loadTemplate: () => void;
  reset: () => void;
  markExported: () => void;
  dismissImportWarnings: () => void;
}

function persistedStateFor(doc: AgendaDocument, ui: { collapsedTops: Set<string>; filter: ItemFilter }) {
  return {
    schemaVersion: 1 as const,
    savedAt: new Date().toISOString(),
    markdown: serializeAgenda(doc),
    ui: { collapsedTops: Array.from(ui.collapsedTops), filter: ui.filter },
  };
}

function initialDocument(): { doc: AgendaDocument; ui: { collapsedTops: Set<string>; filter: ItemFilter } } {
  const persisted = loadPersisted();
  if (persisted?.markdown) {
    try {
      const doc = parseAgenda(persisted.markdown);
      return {
        doc,
        ui: { collapsedTops: new Set(persisted.ui?.collapsedTops ?? []), filter: (persisted.ui?.filter as ItemFilter) ?? "alle" },
      };
    } catch {
      // fällt durch auf Vorlage
    }
  }
  return { doc: parseAgenda(vorlageGoettingen), ui: { collapsedTops: new Set(), filter: "alle" } };
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
      set(() => {
        afterChange(doc);
        return { doc, dirtySinceExport: false, importWarnings: doc.warnings, ui: { collapsedTops: new Set(), filter: "alle" } };
      });
      return doc.warnings;
    },

    loadTemplate: () => {
      backupCurrent();
      const doc = parseAgenda(vorlageGoettingen);
      set(() => {
        afterChange(doc);
        return { doc, dirtySinceExport: false, importWarnings: [], ui: { collapsedTops: new Set(), filter: "alle" } };
      });
    },

    reset: () => {
      backupCurrent();
      const doc = createEmptyAgenda();
      set(() => {
        afterChange(doc);
        return { doc, dirtySinceExport: false, importWarnings: [], ui: { collapsedTops: new Set(), filter: "alle" } };
      });
    },

    markExported: () => set({ dirtySinceExport: false, lastSavedAt: new Date().toISOString() }),

    dismissImportWarnings: () => set({ importWarnings: [] }),
  };
});

export function serializeCurrentDocument(): string {
  return serializeAgenda(useAgendaStore.getState().doc);
}
