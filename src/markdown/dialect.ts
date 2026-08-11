/**
 * Definition des Markdown-Dialekts für die Abnahme-Agenda.
 * Ausführliche, für Menschen lesbare Doku: docs/markdown-dialekt.md
 * Dieses Modul bündelt nur die Konstanten/Regex, die Parser und Serializer
 * gemeinsam nutzen, damit beide garantiert synchron bleiben.
 */

export const FORMAT_ID = "vob-abnahme-agenda";
export const CURRENT_FORMAT_VERSION = 1;

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

/** Bekannte Rahmendaten-Felder in fester Ausgabereihenfolge. */
export const HEADER_FIELD_ORDER: { field: "projekt" | "auftraggeber" | "auftragnehmer" | "fachplanung" | "datum" | "uhrzeit" | "ort"; label: string; matchKeywords: string[] }[] = [
  { field: "projekt", label: "Projekt", matchKeywords: ["projekt"] },
  { field: "auftraggeber", label: "Auftraggeber (AG)", matchKeywords: ["auftraggeber"] },
  { field: "auftragnehmer", label: "Auftragnehmer (AN)", matchKeywords: ["auftragnehmer"] },
  { field: "fachplanung", label: "Fachplanung", matchKeywords: ["fachplanung"] },
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

export function isReservedSection(headingText: string): "rahmendaten" | "teilnehmer" | "hinweis" | "schlusshinweis" | null {
  const lower = headingText.toLowerCase().trim();
  if (lower.includes("rahmendaten")) return "rahmendaten";
  if (lower.includes("teilnehmer")) return "teilnehmer";
  if (lower.includes("schlusshinweis")) return "schlusshinweis";
  if (lower === "hinweis" || lower.startsWith("hinweis")) return "hinweis";
  return null;
}
