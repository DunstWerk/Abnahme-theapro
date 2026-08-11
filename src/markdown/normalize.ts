import type { ItemStatus, Schweregrad } from "../types/agenda";

const STATUS_ALIASES: Record<string, ItemStatus> = {
  "": "offen",
  "-": "offen",
  offen: "offen",
  open: "offen",
  "i.o.": "iO",
  "i.o": "iO",
  io: "iO",
  ok: "iO",
  "in ordnung": "iO",
  erledigt: "iO",
  m: "mangel",
  mangel: "mangel",
  defekt: "mangel",
  entfällt: "entfaellt",
  entfaellt: "entfaellt",
  "n.a.": "entfaellt",
  na: "entfaellt",
  "entf.": "entfaellt",
};

export function normalizeStatus(raw: string): ItemStatus | null {
  const key = raw.trim().toLowerCase();
  return STATUS_ALIASES[key] ?? null;
}

export function normalizeSchweregrad(raw: string): Schweregrad | null {
  const lower = raw.trim().toLowerCase();
  if (lower === "") return null;
  if (lower.includes("unwesentlich")) return "unwesentlich";
  if (lower.includes("wesentlich")) return "wesentlich";
  return null;
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

/** Akzeptiert YYYY-MM-DD oder DD.MM.YYYY, gibt kanonisch YYYY-MM-DD zurück (oder null). */
export function normalizeDate(raw: string): string | null {
  const trimmed = raw.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) {
    const [, y, m, d] = iso;
    if (!isValidCalendarDate(Number(y), Number(m), Number(d))) return null;
    return `${y}-${m}-${d}`;
  }
  const de = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(trimmed);
  if (de) {
    const [, d, m, y] = de;
    if (!isValidCalendarDate(Number(y), Number(m), Number(d))) return null;
    return `${y}-${m}-${d}`;
  }
  return null;
}

/** Für Anzeige in UI/PDF: YYYY-MM-DD -> DD.MM.YYYY. Unparsbares wird unverändert zurückgegeben. */
export function formatDateDe(iso: string | null): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const [, y, mo, d] = m;
  return `${d}.${mo}.${y}`;
}
