/**
 * Datenmodell der Abnahme-Agenda. Wird sowohl von der UI (Zustand-Store) als
 * auch vom Markdown-Parser/-Serializer (src/markdown) und der PDF-Erzeugung
 * (src/pdf) verwendet. `uid` wird beim Parsen bzw. Anlegen neu vergeben und
 * NIE serialisiert (nur React-Keys / Mängel-Referenzen).
 */

export type ItemStatus = "offen" | "iO" | "mangel" | "entfaellt";

export type Schweregrad = "wesentlich" | "unwesentlich";

export interface ChecklistItem {
  uid: string;
  text: string;
  status: ItemStatus;
  kommentar: string;
  /**
   * Wird im Speicher behalten, auch wenn der Status kurzzeitig von "mangel"
   * wegwechselt, damit ein Zurückwechseln nichts verliert. Wird nur
   * serialisiert, wenn status === "mangel".
   */
  schweregrad: Schweregrad | null;
  /** Canonical Format: YYYY-MM-DD. */
  frist: string | null;
  children: ChecklistItem[];
  /** Unbekannte "- Key: value"-Metadatenzeilen, für verlustfreien Round-Trip. */
  extra: Record<string, string>;
}

export interface SubSection {
  uid: string;
  /** Die exakte Heading-Zeile (ohne "### "), z.B. "2.2 Inspizientenanlage Pult". */
  rawHeading: string;
  nummer: string | null;
  titel: string;
  preamble: string[];
  items: ChecklistItem[];
}

export interface Top {
  uid: string;
  /** Die exakte Heading-Zeile (ohne "## "), z.B. "TOP 1 – Begrüßung, Formalien". */
  rawHeading: string;
  nummer: string | null;
  titel: string;
  preamble: string[];
  items: ChecklistItem[];
  sections: SubSection[];
  /** War an dieser Stelle ein "<!-- maengelliste:auto -->"-Marker vorhanden? */
  maengelAnchor: boolean;
}

export interface Teilnehmer {
  uid: string;
  name: string;
  firmaFunktion: string;
  rolle: string;
}

export interface AgendaHeader {
  projekt: string;
  auftraggeber: string;
  auftragnehmer: string;
  fachplanung: string;
  datum: string;
  uhrzeit: string;
  ort: string;
  /** Unbekannte "- **Feld:** Wert"-Bullets, für verlustfreien Round-Trip. */
  weitere: Record<string, string>;
}

export interface ParseWarning {
  line: number;
  message: string;
  severity: "info" | "warn";
}

export interface AgendaDocument {
  formatVersion: number;
  titel: string;
  header: AgendaHeader;
  teilnehmer: Teilnehmer[];
  hinweis: string;
  tops: Top[];
  schlussHinweis: string;
  /** Nur beim Parsen befüllt, nicht Teil des persistenten Modells. */
  warnings: ParseWarning[];
}

/** Abgeleitet aus dem Status aller Items – nie gespeichert, immer neu berechnet. */
export interface MangelEntry {
  nr: number;
  itemUid: string;
  beschreibung: string;
  kommentar: string;
  ortLabel: string;
  schweregrad: Schweregrad | null;
  frist: string | null;
}

export const HEADER_LABELS: Record<keyof Omit<AgendaHeader, "weitere">, string> = {
  projekt: "Projekt",
  auftraggeber: "Auftraggeber (AG)",
  auftragnehmer: "Auftragnehmer (AN)",
  fachplanung: "Fachplanung",
  datum: "Datum",
  uhrzeit: "Uhrzeit",
  ort: "Ort",
};

export function createEmptyHeader(): AgendaHeader {
  return {
    projekt: "",
    auftraggeber: "",
    auftragnehmer: "",
    fachplanung: "",
    datum: "",
    uhrzeit: "",
    ort: "",
    weitere: {},
  };
}

export function createEmptyAgenda(): AgendaDocument {
  return {
    formatVersion: 1,
    titel: "VOB-Abnahme",
    header: createEmptyHeader(),
    teilnehmer: [],
    hinweis: "",
    tops: [],
    schlussHinweis: "",
    warnings: [],
  };
}

export function createEmptyItem(text = ""): ChecklistItem {
  return {
    uid: crypto.randomUUID(),
    text,
    status: "offen",
    kommentar: "",
    schweregrad: null,
    frist: null,
    children: [],
    extra: {},
  };
}
