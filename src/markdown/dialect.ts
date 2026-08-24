/**
 * Definition des Markdown-Dialekts für die Abnahme-Agenda.
 * Ausführliche, für Menschen lesbare Doku: docs/markdown-dialekt.md
 * Dieses Modul bündelt nur die Konstanten/Regex, die Parser und Serializer
 * gemeinsam nutzen, damit beide garantiert synchron bleiben.
 */
import type { AbnahmeErgebnisArt, Termintreue } from "../types/agenda";

export const FORMAT_ID = "vob-abnahme-agenda";
export const CURRENT_FORMAT_VERSION = 2;

export const ANCHOR_LINE = "<!-- maengelliste:auto -->";
export const ANCHOR_RE = /^<!--\s*maengelliste:auto\s*-->$/i;

export const FRONT_MATTER_DELIM_RE = /^---\s*$/;
export const FORMAT_LINE_RE = new RegExp(`^format:\\s*${FORMAT_ID}/(\\d+)\\s*$`, "i");

export const TITLE_RE = /^#\s+(.+?)\s*$/;
export const TOP_LEVEL_HEADING_RE = /^##\s+(.+?)\s*$/;
export const SUB_HEADING_RE = /^###\s+(.+?)\s*$/;

// "TOP 1 – Begrüßung, Formalien" / "TOP 4 - Mängelfeststellung" (Bindestrich oder Halbgeviertstrich)
export const TOP_TITLE_RE = /^TOP\s+(\S+)\s*[–—-]\s*(.+)$/i;
// "2.2 Inspizientenanlage Pult" – führende Gliederungsnummer, Rest ist der Titel.
export const SUBSECTION_TITLE_RE = /^(\d+(?:\.\d+)*)\s+(.+)$/;

// "- [ ] Text", "  - [x] Text" – Gruppe 1 = Einrückung, 2 = Statuszeichen, 3 = Text.
export const ITEM_RE = /^( *)-\s\[([ xX!\-~])\]\s+(.*)$/;
// "  - Status: Mangel" – KEIN Checkbox-Klammerpaar. Gruppe 1 = Einrückung, 2 = Key, 3 = Wert.
export const META_RE = /^( *)-\s+([^:\n]+):\s*(.*)$/;

// "- **Projekt:** Wert" – der Doppelpunkt steht INNERHALB der Fett-Markierung.
export const HEADER_BULLET_RE = /^-\s+\*\*([^*]+?):\*\*\s*(.*)$/;

/** Eigenständige Ja/Nein-Bullet-Zeile in "## Rahmendaten", steuert AgendaDocument.oenorm. */
export const RECHTSGRUNDLAGE_LABEL = "Rechtsgrundlage ÖNORM";

/** Eigenständige Freitext-Bullet-Zeile in "## Rahmendaten", steuert AgendaDocument.uebernahmeBezeichnung. */
export const UEBERNAHME_BEZEICHNUNG_LABEL = "Bezeichnung Übernahme/Abnahme";

export const TABLE_ROW_RE = /^\|(.+)\|\s*$/;
export const TABLE_SEP_RE = /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

export const CHECKBOX_TO_STATUS: Record<string, "offen" | "iO" | "mangel" | "entfaellt"> = {
  " ": "offen",
  x: "iO",
  X: "iO",
  "!": "mangel",
  "-": "entfaellt",
  "~": "entfaellt",
};

export const STATUS_TO_CHECKBOX: Record<"offen" | "iO" | "mangel" | "entfaellt", string> = {
  offen: " ",
  iO: "x",
  mangel: "!",
  entfaellt: "-",
};

export const STATUS_LABEL: Record<"offen" | "iO" | "mangel" | "entfaellt", string> = {
  offen: "offen",
  iO: "i.O.",
  mangel: "Mangel",
  entfaellt: "entfällt",
};

export const TEILNEHMER_HEADER_ROW = "| Name | Firma / Funktion | Rolle beim Termin |";
export const TEILNEHMER_SEP_ROW = "|---|---|---|";

export const VERJAEHRUNG_HEADER_ROW = "| Nr. | Anlagenteil | Beginn | Ende |";
export const VERJAEHRUNG_SEP_ROW = "|---|---|---|---|";

export const UNTERSCHRIFT_HEADER_ROW = "| Name | Funktion |";
export const UNTERSCHRIFT_SEP_ROW = "|---|---|";

export const FESTSTELLUNG_HEADER_ROW = "| Bezeichnung | Beschreibung | Zuständig | Frist |";
export const FESTSTELLUNG_SEP_ROW = "|---|---|---|---|";

/** Bekannte Rahmendaten-Felder in fester Ausgabereihenfolge (Reihenfolge ist auch Priorität beim Erkennen). */
export const HEADER_FIELD_ORDER: {
  field:
    | "projekt"
    | "gewerk"
    | "auftragsnummer"
    | "auftraggeber"
    | "auftraggeberAdresse"
    | "auftragnehmer"
    | "fachplanung"
    | "bearbeiter"
    | "datum"
    | "uhrzeit"
    | "ort";
  label: string;
  matchKeywords: string[];
}[] = [
  { field: "projekt", label: "Projekt", matchKeywords: ["projekt"] },
  { field: "gewerk", label: "Gewerk / Art der Arbeiten", matchKeywords: ["gewerk"] },
  { field: "auftragsnummer", label: "Auftragsnummer", matchKeywords: ["auftragsnummer", "auftragsdatum"] },
  { field: "auftraggeber", label: "Auftraggeber (AG)", matchKeywords: ["auftraggeber"] },
  { field: "auftraggeberAdresse", label: "Anschrift (AG)", matchKeywords: ["anschrift"] },
  { field: "auftragnehmer", label: "Auftragnehmer (AN)", matchKeywords: ["auftragnehmer"] },
  { field: "fachplanung", label: "Fachplanung", matchKeywords: ["fachplanung"] },
  { field: "bearbeiter", label: "Bearbeiter", matchKeywords: ["bearbeiter"] },
  { field: "datum", label: "Datum", matchKeywords: ["datum"] },
  { field: "uhrzeit", label: "Uhrzeit", matchKeywords: ["uhrzeit", "beginn"] },
  { field: "ort", label: "Ort", matchKeywords: ["ort"] },
];

export function matchHeaderLabel(rawLabel: string): (typeof HEADER_FIELD_ORDER)[number]["field"] | null {
  const lower = rawLabel.toLowerCase();
  for (const entry of HEADER_FIELD_ORDER) {
    if (entry.matchKeywords.some((kw) => lower.includes(kw))) return entry.field;
  }
  return null;
}

/** Bekannte Felder im Abschnitt "## Abnahmeergebnis" (§3.1–§3.3). */
export const ERGEBNIS_FIELD_ORDER: {
  field: "ergebnis" | "maengelbeseitigungFrist" | "fristAngemessen" | "termintreue";
  label: string;
  matchKeywords: string[];
}[] = [
  { field: "ergebnis", label: "Ergebnis", matchKeywords: ["ergebnis"] },
  {
    field: "maengelbeseitigungFrist",
    label: "Frist zur Mängelbeseitigung",
    matchKeywords: ["frist zur mängelbeseitigung", "frist zur maengelbeseitigung", "mängelbeseitigungsfrist"],
  },
  { field: "fristAngemessen", label: "Frist angemessen", matchKeywords: ["frist angemessen"] },
  { field: "termintreue", label: "Fertigstellung", matchKeywords: ["fertigstellung", "termintreue"] },
];

export function matchErgebnisLabel(rawLabel: string): (typeof ERGEBNIS_FIELD_ORDER)[number]["field"] | null {
  const lower = rawLabel.toLowerCase();
  for (const entry of ERGEBNIS_FIELD_ORDER) {
    if (entry.matchKeywords.some((kw) => lower.includes(kw))) return entry.field;
  }
  return null;
}

export const ERGEBNIS_LABEL: Record<AbnahmeErgebnisArt, string> = {
  ohneMaengel: "ohne Mängel",
  nichtAbgenommen: "nicht abgenommen",
  mitMaengeln: "mit Mängeln",
};

export const TERMINTREUE_LABEL: Record<Termintreue, string> = {
  termingerecht: "termingerecht",
  nichtTermingerecht: "nicht termingerecht",
};

export const WARTUNGSVERTRAG_NR_LABEL = "Für die Nr.";

/** Für Tabellenzellen der neuen Abschnitte (Verjährung/Unterschriften/Feststellungen):
 * "|" darf nicht roh in einer GFM-Zelle stehen, Zeilenumbrüche auch nicht (z.B. mehrzeilige
 * Feststellungs-Beschreibung) – deshalb Escaping. Die bestehende Teilnehmer-Tabelle bleibt
 * bewusst unverändert (kein Bedarf, keine Breaking Change riskieren). */
export function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, "<br>");
}

export function unescapeCell(value: string): string {
  return value.replace(/<br\s*\/?>/gi, "\n").replace(/\\\|/g, "|");
}

/** Zerlegt den Inhalt zwischen den äußeren "|" einer Tabellenzeile, respektiert "\|" als Escape
 * (im Unterschied zum simplen `.split("|")`, das für die neuen Tabellen mit escapeCell() nötig ist). */
export function splitTableRow(raw: string): string[] {
  const cells: string[] = [];
  let current = "";
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === "\\" && raw[i + 1] === "|") {
      current += "\\|";
      i++;
    } else if (ch === "|") {
      cells.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells.map(unescapeCell);
}

function normalizeHeading(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");
}

export type ReservedSection =
  | "rahmendaten"
  | "teilnehmer"
  | "hinweis"
  | "schlusshinweis"
  | "abnahmeergebnis"
  | "verjaehrung"
  | "verjaehrungWartung"
  | "sonstiges"
  | "unterschriften"
  | "feststellungen";

/** Exakte (normalisierte) Überschriften der neuen, festen Abschnitte – bewusst KEIN includes()-Vergleich,
 * damit z.B. "TOP 4 – Mängelfeststellung und Dokumentation" niemals mit "Feststellungen" kollidiert. */
const EXACT_SECTION_MAP: Record<string, ReservedSection> = {
  abnahmeergebnis: "abnahmeergebnis",
  "verjaehrungsfristen bei wartungsvertrag": "verjaehrungWartung",
  verjaehrungsfristen: "verjaehrung",
  sonstiges: "sonstiges",
  unterschriften: "unterschriften",
  "feststellungen und festlegungen": "feststellungen",
};

export function isReservedSection(headingText: string): ReservedSection | null {
  const trimmed = headingText.trim();
  // "TOP n – Titel" ist IMMER ein TOP, nie eine reservierte Sektion (auch wenn der Titel
  // zufällig ein reserviertes Wort wie "Feststellung" enthält, z.B. "Mängelfeststellung").
  if (TOP_TITLE_RE.test(trimmed)) return null;

  const normalized = normalizeHeading(trimmed);
  const exact = EXACT_SECTION_MAP[normalized];
  if (exact) return exact;

  const lower = trimmed.toLowerCase();
  if (lower.includes("rahmendaten")) return "rahmendaten";
  if (lower.includes("teilnehmer")) return "teilnehmer";
  if (lower.includes("schlusshinweis")) return "schlusshinweis";
  if (lower === "hinweis" || lower.startsWith("hinweis")) return "hinweis";
  return null;
}
