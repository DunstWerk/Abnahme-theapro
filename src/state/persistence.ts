const CURRENT_KEY = "abnahme-theapro:v1:current";
const BACKUP_KEY = "abnahme-theapro:v1:backup";
const PREFS_KEY = "abnahme-theapro:v1:prefs";

export interface PersistedState {
  schemaVersion: 1;
  savedAt: string;
  markdown: string;
  ui: { collapsedTops: string[]; filter: string };
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let pending: PersistedState | null = null;

function writeNow(state: PersistedState): void {
  try {
    localStorage.setItem(CURRENT_KEY, JSON.stringify(state));
  } catch {
    // localStorage kann in seltenen Fällen voll/gesperrt sein – Abnahme läuft weiter, nur ohne Autosave.
  }
  pending = null;
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

/** Debounced Schreiben (750ms), z.B. bei jeder Store-Änderung aufzurufen. */
export function scheduleSave(state: PersistedState): void {
  pending = state;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (pending) writeNow(pending);
  }, 750);
}

/** Sofort schreiben, z.B. bei beforeunload/visibilitychange. */
export function flushSave(): void {
  if (pending) writeNow(pending);
}

export function loadPersisted(): PersistedState | null {
  try {
    const raw = localStorage.getItem(CURRENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}

/** Vor Import/Vorlage-Laden/Reset aufrufen, damit der bisherige Stand nicht verloren geht. */
export function backupCurrent(): void {
  try {
    const raw = localStorage.getItem(CURRENT_KEY);
    if (raw) localStorage.setItem(BACKUP_KEY, raw);
  } catch {
    // ignorieren – Backup ist best effort
  }
}

export function loadBackup(): PersistedState | null {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}

export function hasBackup(): boolean {
  try {
    return localStorage.getItem(BACKUP_KEY) !== null;
  } catch {
    return false;
  }
}

/** Dauerhafte, session-übergreifende App-Einstellung (kein Dokument-Inhalt) –
 * bewusst ein eigener Key, getrennt von der debounced Dokument-Autosave, damit sie
 * Reset/Import/Vorlage-Laden übersteht. */
export interface AppPrefs {
  skipDeleteConfirm: boolean;
}

const DEFAULT_PREFS: AppPrefs = { skipDeleteConfirm: false };

export function loadPrefs(): AppPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<AppPrefs>) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(prefs: AppPrefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignorieren – Präferenz ist best effort
  }
}

export function registerFlushOnUnload(): () => void {
  const handler = () => flushSave();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushSave();
  });
  window.addEventListener("beforeunload", handler);
  return () => window.removeEventListener("beforeunload", handler);
}
