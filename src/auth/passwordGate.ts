/**
 * Einfache clientseitige Zugriffssperre für die App (keine echte Sicherheit –
 * der Code läuft im Browser des Besuchers und ist damit grundsätzlich einsehbar/
 * umgehbar). Zweck ist nur, zufällige Besucher im Netz von der öffentlich
 * gehosteten GitHub-Pages-Seite fernzuhalten, kein Schutz vertraulicher Daten.
 *
 * Das Passwort wird nicht im Klartext im Bundle abgelegt, sondern nur sein
 * SHA-256-Hash verglichen. Passwort ändern: neuen Hash z. B. per
 * `crypto.subtle.digest("SHA-256", ...)` in der Browser-Konsole erzeugen und
 * hier eintragen.
 */

const PASSWORD_HASH = "46eaa10d3f7b8310787b223bce4d97414faa92d74d34830a8d182981aa04ed89";
const UNLOCKED_KEY = "abnahme-theapro:v1:unlocked";

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function checkPassword(input: string): Promise<boolean> {
  const hash = await sha256Hex(input);
  return hash === PASSWORD_HASH;
}

export function isUnlocked(): boolean {
  try {
    return localStorage.getItem(UNLOCKED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markUnlocked(): void {
  try {
    localStorage.setItem(UNLOCKED_KEY, "1");
  } catch {
    // localStorage nicht verfügbar (z. B. privater Modus) – Sperre bleibt dann
    // pro Seitenaufruf bestehen, App bleibt trotzdem nutzbar.
  }
}
