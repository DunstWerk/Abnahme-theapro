export type InstallPlatform = "already-standalone" | "chromium-promptable" | "ios" | "unsupported";

/**
 * Grobe, rein informative Geräte-/Browser-Einordnung für den
 * Installations-Hinweis in der Tour (kein sicherheitsrelevanter Zweck).
 */
export function detectInstallPlatform(canInstall: boolean, isInstalled: boolean): InstallPlatform {
  if (isInstalled) return "already-standalone";
  if (canInstall) return "chromium-promptable"; // beforeinstallprompt gefeuert: Android Chrome & Desktop Chrome/Edge
  if (isIos()) return "ios";
  return "unsupported"; // z. B. Desktop Firefox
}

/**
 * Erkennt jedes iOS/iPadOS-Gerät, nicht nur Safari selbst: Chrome/Firefox/Edge auf iOS (CriOS/
 * FxiOS/EdgiOS) laufen technisch alle auf WebKit und teilen sich denselben System-Share-Sheet mit
 * „Zum Home-Bildschirm" – dort fälschlich „nicht unterstützt" anzuzeigen, nur weil es nicht
 * wörtlich Safari ist, wäre für einen Großteil der iPhone/iPad-Nutzer irreführend.
 */
function isIos(): boolean {
  const ua = navigator.userAgent;
  return (
    /iP(hone|ad|od)/.test(ua) ||
    // iPadOS 13+ meldet sich als "Macintosh", hat aber Touch-Unterstützung – anders als echtes macOS.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}
