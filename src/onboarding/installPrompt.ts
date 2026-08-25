/**
 * Gemeinsamer Status für die App-Installation (PWA), gespeist aus den
 * `beforeinstallprompt`/`appinstalled`-Events. ES-Module sind pro Prozess
 * einmalig, daher wird hier genau ein Listener registriert, egal wie oft
 * `useInstallPrompt()` (aus Toolbar *und* Tutorial) aufgerufen wird.
 */
import { useSyncExternalStore } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

interface InstallState {
  deferredEvent: BeforeInstallPromptEvent | null;
  installed: boolean;
}

function isStandaloneDisplay(): boolean {
  try {
    return (
      window.matchMedia?.("(display-mode: standalone)").matches === true ||
      (window.navigator as { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}

let state: InstallState = { deferredEvent: null, installed: isStandaloneDisplay() };
const listeners = new Set<() => void>();

function setState(partial: Partial<InstallState>) {
  state = { ...state, ...partial };
  for (const l of listeners) l();
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  setState({ deferredEvent: e as BeforeInstallPromptEvent });
});

window.addEventListener("appinstalled", () => {
  setState({ deferredEvent: null, installed: true });
});

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const ev = state.deferredEvent;
  if (!ev) return "unavailable";
  await ev.prompt();
  const { outcome } = await ev.userChoice;
  // Das Event ist Einmal-verwendbar – Chrome feuert beforeinstallprompt nur einmal pro Seitenaufruf.
  setState({ deferredEvent: null, installed: outcome === "accepted" ? true : state.installed });
  return outcome;
}

export function useInstallPrompt(): {
  canInstall: boolean;
  isInstalled: boolean;
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
} {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { canInstall: snapshot.deferredEvent !== null, isInstalled: snapshot.installed, promptInstall };
}
