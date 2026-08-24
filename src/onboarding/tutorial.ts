/**
 * Merkt sich, ob die Einführungs-Tour schon gesehen wurde (analog zu
 * auth/passwordGate.ts). Rein clientseitig über localStorage, kein Server
 * beteiligt.
 */

const TUTORIAL_SEEN_KEY = "abnahme-theapro:v1:tutorial-seen";

export function hasSeenTutorial(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function markTutorialSeen(): void {
  try {
    localStorage.setItem(TUTORIAL_SEEN_KEY, "1");
  } catch {
    // localStorage nicht verfügbar (z. B. privater Modus) – Tour erscheint
    // dann bei jedem Aufruf erneut, App bleibt trotzdem nutzbar.
  }
}
