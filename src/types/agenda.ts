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
  /** §1 Bauvorhaben / Objekt */
  projekt: string;
  /** §1 Art der Arbeiten / Gewerk */
  gewerk: string;
  /** §1 Auftragsdatum / Auftragsnummer */
  auftragsnummer: string;
  auftraggeber: string;
  /** §1 Anschrift (AG), einzeilig */
  auftraggeberAdresse: string;
  auftragnehmer: string;
  fachplanung: string;
  /** Briefkopf "Bearbeiter:" – ändert sich je Abnahme, im Gegensatz zu den übrigen Briefkopfdaten. */
  bearbeiter: string;
  /** = "Datum der Abnahme" */
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

/** §3.1 der Niederschrift. */
export type AbnahmeErgebnisArt = "ohneMaengel" | "nichtAbgenommen" | "mitMaengeln";

/** §3.3 der Niederschrift. */
export type Termintreue = "termingerecht" | "nichtTermingerecht";

/** Eine Zeile der Verjährungsfristen-Tabelle (§4.1 oder §4.2). */
export interface Verjaehrungsfrist {
  uid: string;
  nr: string;
  anlagenteil: string;
  /** Freitext (auch "mit Abnahme" o.ä.), bewusst nicht datumsnormalisiert. */
  beginn: string;
  /** Freitext (auch "4 Jahre nach Abnahme" o.ä.), bewusst nicht datumsnormalisiert. */
  ende: string;
}

/** Eine Unterschriftenzeile in §6. */
export interface Unterschrift {
  uid: string;
  name: string;
  /** Optional, z.B. "AG"/"AN"/"Fachplanung" – darf leer bleiben. */
  funktion: string;
}

/** §3–§6 der formellen Abnahme-Niederschrift. */
export interface Niederschrift {
  ergebnis: AbnahmeErgebnisArt | null;
  /** §3.2, Frist zur Mängelbeseitigung. Canonical Format: YYYY-MM-DD. */
  maengelbeseitigungFrist: string | null;
  /** §3.2, "Die Frist wird als angemessen erachtet." */
  fristAngemessen: boolean;
  termintreue: Termintreue | null;
  /** §4.1 */
  verjaehrung: Verjaehrungsfrist[];
  /** §4.2 */
  verjaehrungWartung: Verjaehrungsfrist[];
  /** §4.2 "Für die Nr. ___ aus der vorstehenden Aufstellung gelten ..." */
  wartungsvertragNr: string;
  /** §5, mehrzeiliger Freitext. */
  sonstiges: string;
  /** §6 */
  unterschriften: Unterschrift[];
  /** Unbekannte "- **Feld:** Wert"-Bullets in "## Abnahmeergebnis", für verlustfreien Round-Trip. */
  weitere: Record<string, string>;
}

/** Eine Zeile in Anlage 2 "Feststellungen und Festlegungen" – frei, unabhängig von der Checkliste gepflegt. */
export interface Feststellung {
  uid: string;
  bezeichnung: string;
  /** Darf \n enthalten. */
  beschreibung: string;
  zustaendig: string;
  /** Canonical Format: YYYY-MM-DD. */
  frist: string | null;
}

export interface AgendaDocument {
  formatVersion: number;
  titel: string;
  header: AgendaHeader;
  teilnehmer: Teilnehmer[];
  hinweis: string;
  tops: Top[];
  schlussHinweis: string;
  niederschrift: Niederschrift;
  /** Anlage 2. */
  feststellungen: Feststellung[];
  /** Steuert, ob die PDF-Ausgabe sich auf VOB/B (Deutschland, false) oder
   * ÖNORM B 2110 (Österreich, true) bezieht – Titel, §-Überschriften und
   * Rechtsgrundlage-Sätze in src/pdf/ werden entsprechend ausgewählt. */
  oenorm: boolean;
  /** Überschreibt das Substantiv "Übernahme"/"Abnahme" im PDF, z.B. "Teilübernahme"
   * oder "Teilabnahme" – leer = Standardwort je nach `oenorm` (siehe abnahmeWort()). */
  uebernahmeBezeichnung: string;
  /** Nur beim Parsen befüllt, nicht Teil des persistenten Modells. */
  warnings: ParseWarning[];
}

/** Abgeleitet aus dem Status aller Items – nie gespeichert, immer neu berechnet. */
export interface MangelEntry {
  nr: number;
  itemUid: string;
  beschreibung: string;
  kommentar: string;
  /** "TOP 2 › 2.3 Mitschauanlage" – ohne Item-Text, für Anlage 1s "Bezeichnung"-Spalte. */
  ortKurz: string;
  /** "TOP 2 › 2.3 Mitschauanlage › <Item-Text gekürzt>" – für die Live-Ansicht/CSV. */
  ortLabel: string;
  schweregrad: Schweregrad | null;
  frist: string | null;
}

export const HEADER_LABELS: Record<keyof Omit<AgendaHeader, "weitere">, string> = {
  projekt: "Projekt",
  gewerk: "Gewerk / Art der Arbeiten",
  auftragsnummer: "Auftragsnummer",
  auftraggeber: "Auftraggeber (AG)",
  auftraggeberAdresse: "Anschrift (AG)",
  auftragnehmer: "Auftragnehmer (AN)",
  fachplanung: "Fachplanung",
  bearbeiter: "Bearbeiter",
  datum: "Datum",
  uhrzeit: "Uhrzeit",
  ort: "Ort",
};

export function createEmptyHeader(): AgendaHeader {
  return {
    projekt: "",
    gewerk: "",
    auftragsnummer: "",
    auftraggeber: "",
    auftraggeberAdresse: "",
    auftragnehmer: "",
    fachplanung: "",
    bearbeiter: "",
    datum: "",
    uhrzeit: "",
    ort: "",
    weitere: {},
  };
}

export function createEmptyNiederschrift(): Niederschrift {
  return {
    ergebnis: null,
    maengelbeseitigungFrist: null,
    fristAngemessen: false,
    termintreue: null,
    verjaehrung: [],
    verjaehrungWartung: [],
    wartungsvertragNr: "",
    sonstiges: "",
    unterschriften: [],
    weitere: {},
  };
}

export function createEmptyVerjaehrungsfrist(): Verjaehrungsfrist {
  return { uid: crypto.randomUUID(), nr: "", anlagenteil: "", beginn: "", ende: "" };
}

export function createEmptyUnterschrift(): Unterschrift {
  return { uid: crypto.randomUUID(), name: "", funktion: "" };
}

export function createEmptyFeststellung(): Feststellung {
  return { uid: crypto.randomUUID(), bezeichnung: "", beschreibung: "", zustaendig: "", frist: null };
}

export function createEmptyAgenda(): AgendaDocument {
  return {
    formatVersion: 2,
    titel: "VOB-Abnahme",
    header: createEmptyHeader(),
    teilnehmer: [],
    hinweis: "",
    tops: [],
    schlussHinweis: "",
    niederschrift: createEmptyNiederschrift(),
    feststellungen: [],
    oenorm: false,
    uebernahmeBezeichnung: "",
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

/** Default-Titel für im Bearbeitungsmodus neu angelegte Einträge. Bewusst nicht leer:
 * ein leerer Titel würde beim Serialisieren z.B. zu "## TOP 5 –" führen, was beim
 * Re-Import an TOP_TITLE_RE scheitert und die Nummer verliert. */
export const DEFAULT_TOP_TITEL = "Neues TOP";
export const DEFAULT_SECTION_TITEL = "Neuer Abschnitt";
export const DEFAULT_ITEM_TEXT = "Neuer Punkt";

/** Rekonstruiert die "## "-Überschrift eines TOP – von serializeAgenda.ts UND von
 * createEmptyTop/updateTop im Store genutzt, damit beide Stellen garantiert synchron bleiben. */
export function formatTopHeading(nummer: string | null, titel: string): string {
  return nummer != null ? `TOP ${nummer} – ${titel}` : titel;
}

/** Rekonstruiert die "### "-Überschrift eines Abschnitts, analog zu formatTopHeading. */
export function formatSectionHeading(nummer: string | null, titel: string): string {
  return nummer != null ? `${nummer} ${titel}` : titel;
}

export function createEmptyTop(nummer: string | null, titel: string = DEFAULT_TOP_TITEL): Top {
  return {
    uid: crypto.randomUUID(),
    rawHeading: formatTopHeading(nummer, titel),
    nummer,
    titel,
    preamble: [],
    items: [],
    sections: [],
    maengelAnchor: false,
  };
}

/** "Abnahme"/"Übernahme" bzw. "abgenommen"/"übernommen" je nach AgendaDocument.oenorm – zentrale
 * Stelle, damit PDF-Ausgabe (src/pdf/niederschrift.ts) und Live-Vorschau (AbnahmeErgebnisForm.tsx)
 * garantiert denselben Wortlaut zeigen. Bewusst hier statt in src/pdf/, damit UI-Komponenten diese
 * Funktion nutzen können, ohne PDF-Code (inkl. eingebettetem Firmenlogo) in den Hauptbundle zu ziehen.
 *
 * `doc.uebernahmeBezeichnung` überschreibt bewusst NUR das großgeschriebene Substantiv
 * (kapitalisiert=true, z.B. für "Teilübernahme" statt "Übernahme" im Titel) – die Verbform
 * ("übernommen"/"abgenommen") bleibt immer unverändert, da z.B. "teilübernommen" kein
 * gebräuchliches Wort ist. */
export function abnahmeWort(doc: AgendaDocument, kapitalisiert = false): string {
  if (kapitalisiert && doc.uebernahmeBezeichnung.trim() !== "") return doc.uebernahmeBezeichnung.trim();
  if (doc.oenorm) return kapitalisiert ? "Übernahme" : "übernommen";
  return kapitalisiert ? "Abnahme" : "abgenommen";
}

/** Gemeinsame §3.1-Ergebnistexte, siehe abnahmeWort(). */
export function ergebnisLabel(art: AbnahmeErgebnisArt, doc: AgendaDocument, bereich: string): string {
  const w = abnahmeWort(doc);
  if (art === "ohneMaengel") return `ohne Mängel ${w}.`;
  if (art === "nichtAbgenommen") return `nicht ${w}.`;
  return `mit den Mängeln Nr. ${bereich || "___"} gemäß Mängelliste (Anlage 1) ${w}.`;
}

export function createEmptySubSection(nummer: string | null, titel: string = DEFAULT_SECTION_TITEL): SubSection {
  return {
    uid: crypto.randomUUID(),
    rawHeading: formatSectionHeading(nummer, titel),
    nummer,
    titel,
    preamble: [],
    items: [],
  };
}
