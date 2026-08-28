import { useInstallPrompt } from "../onboarding/installPrompt";
import { detectInstallPlatform } from "../onboarding/platform";
import styles from "./tutorial.module.css";

export default function InstallTutorialStep() {
  const { canInstall, isInstalled, promptInstall } = useInstallPrompt();
  const platform = detectInstallPlatform(canInstall, isInstalled);

  if (platform === "already-standalone") {
    return (
      <p className={styles.tooltipText}>
        Ihr habt die App auf diesem Gerät bereits installiert – sie läuft schon eigenständig, ganz ohne
        Browser-Adressleiste.
      </p>
    );
  }

  if (platform === "chromium-promptable") {
    return (
      <>
        <p className={styles.tooltipText}>
          Diese App lässt sich wie eine normale App installieren – dann startet sie über ein eigenes Icon, ganz ohne
          Browser-Adressleiste, und funktioniert auch offline (z. B. auf der Baustelle ohne WLAN). Auf diesem Gerät
          geht das direkt:
        </p>
        <button type="button" className={styles.installButton} onClick={() => void promptInstall()}>
          Jetzt installieren
        </button>
      </>
    );
  }

  if (platform === "ios") {
    return (
      <p className={styles.tooltipText}>
        Diese App lässt sich wie eine normale App installieren – dann startet sie über ein eigenes Icon, ganz ohne
        Browser-Adressleiste, und funktioniert auch offline. Auf dem iPhone/iPad geht das über das Teilen-Symbol
        eures Browsers (Quadrat mit Pfeil nach oben), meist unten oder oben in der Leiste: antippen, dann „Zum
        Home-Bildschirm" wählen.
      </p>
    );
  }

  return (
    <p className={styles.tooltipText}>
      Diese App lässt sich auf Smartphones und den meisten Desktop-Browsern (Chrome, Edge, Android, iPhone/iPad) wie
      eine normale App installieren – dann startet sie über ein eigenes Icon und funktioniert auch offline. In diesem
      Browser ist das aktuell nicht möglich, probiert es z. B. mit Chrome oder Edge.
    </p>
  );
}
