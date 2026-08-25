export type InstallPlatform = "already-standalone" | "chromium-promptable" | "ios-safari" | "unsupported";

/**
 * Grobe, rein informative Geräte-/Browser-Einordnung für den
 * Installations-Hinweis in der Tour (kein sicherheitsrelevanter Zweck).
 */
export function detectInstallPlatform(canInstall: boolean, isInstalled: boolean): InstallPlatform {
  if (isInstalled) return "already-standalone";
  if (canInstall) return "chromium-promptable"; // beforeinstallprompt gefeuert: Android Chrome & Desktop Chrome/Edge
  if (isIosSafari()) return "ios-safari";
  return "unsupported"; // z. B. Desktop Firefox
}

function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const isIOSDevice =
    /iP(hone|ad|od)/.test(ua) ||
    // iPadOS 13+ meldet sich als "Macintosh", hat aber Touch-Unterstützung – anders als echtes macOS.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafariEngine = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return isIOSDevice && isSafariEngine;
}
