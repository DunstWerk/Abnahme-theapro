import { useEffect, useLayoutEffect, useState, type CSSProperties } from "react";
import styles from "./tutorial.module.css";

interface Step {
  /** CSS-Selektor des hervorzuhebenden Elements, oder null für einen zentrierten Schritt ohne Spotlight. */
  selector: string | null;
  title: string;
  text: string;
}

const STEPS: Step[] = [
  {
    selector: null,
    title: "Willkommen beim VOB-Abnahme Helfer",
    text: `Diese kurze Tour zeigt, wo ihr während einer Abnahme/Übernahme die wichtigsten Funktionen findet. Ihr könnt jederzeit über „Überspringen" oder die Esc-Taste aussteigen.`,
  },
  {
    selector: '[data-tutorial="toolbar-files"]',
    title: "Agenda laden, speichern, exportieren",
    text: "Hier importiert und exportiert ihr die Agenda als .md-Datei (z. B. für ein neues Projekt oder als Sicherung), ladet die mitgelieferte Beispiel-Vorlage oder exportiert Checkliste bzw. Mängelliste als CSV.",
  },
  {
    selector: '[data-tutorial="toolbar-editmode"]',
    title: "Bearbeitungsmodus",
    text: "Im Bearbeitungsmodus könnt ihr TOPs und Punkte per Drag & Drop verschieben, an beliebiger Stelle neue TOPs einfügen sowie Punkte/Abschnitte hinzufügen oder löschen. Die TOP-Nummerierung wird dabei automatisch fortlaufend vergeben.",
  },
  {
    selector: '[data-tutorial="topnav"]',
    title: "Navigation",
    text: "Links springt ihr direkt zu einem TOP und seht auf einen Blick den Bearbeitungsfortschritt sowie erfasste Mängel. Über die Filter oben lassen sich offene Punkte oder Mängel gezielt anzeigen.",
  },
  {
    selector: '[data-tutorial="header-form"]',
    title: "Rahmendaten",
    text: `Projekt-, Auftrags- und Termindaten. Mit der Checkbox „Abnahme nach ÖNORM" stellt ihr das gesamte Dokument von VOB/B (Deutschland) auf ÖNORM B 2110 (Österreich) um. Im Feld „Bezeichnung" überschreibt ihr bei Bedarf das Wort „Abnahme"/„Übernahme", z. B. für eine Teilübernahme.`,
  },
  {
    selector: '[data-tutorial="teilnehmer"]',
    title: "Teilnehmer",
    text: "Alle beim Termin anwesenden Personen mit Firma/Funktion und Rolle (AG, AN, Fachplanung, ...).",
  },
  {
    selector: '[data-tutorial="status-selector"]',
    title: "Punkte abarbeiten",
    text: `Jeder Prüfpunkt bekommt einen Status: offen, i. O., Mangel oder entfällt. Bei „Mangel" könnt ihr direkt Schweregrad, Frist und einen Kommentar erfassen.`,
  },
  {
    selector: '[data-tutorial="maengel-panel"]',
    title: "Mängelliste (live)",
    text: `Wird automatisch aus allen als „Mangel" markierten Punkten zusammengestellt und erscheint im PDF als eigene Anlage – hier müsst ihr nichts doppelt pflegen.`,
  },
  {
    selector: '[data-tutorial="abnahmeergebnis"]',
    title: "Abnahmeergebnis",
    text: "Das eigentliche Ergebnis der Abnahme/Übernahme (mit/ohne Mängel), Fristen zur Mängelbeseitigung und Termintreue. Weiter unten folgen noch Verjährungsfristen, Unterschriften und Feststellungen – die füllt ihr üblicherweise zum Abschluss des Termins aus.",
  },
  {
    selector: '[data-tutorial="toolbar-pdf"]',
    title: "PDF exportieren",
    text: "Erzeugt die vollständige Niederschrift inkl. aller Anlagen (Mängelliste, Feststellungen, Begehungs-Checkliste) als PDF zum Unterschreiben. Ihr könnt diese Tour jederzeit über den Hilfe-Button in der Toolbar erneut starten.",
  },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const SPOTLIGHT_PADDING = 8;
const TOOLTIP_WIDTH = 320;
const TOOLTIP_GAP = 16;

interface Props {
  onClose: () => void;
}

export default function Tutorial({ onClose }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const step = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  useLayoutEffect(() => {
    let cancelled = false;
    let raf = 0;
    let frames = 0;

    function measure() {
      if (!step.selector) {
        setRect(null);
        return;
      }
      const el = document.querySelector<HTMLElement>(step.selector!);
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({
        top: r.top - SPOTLIGHT_PADDING,
        left: r.left - SPOTLIGHT_PADDING,
        width: r.width + SPOTLIGHT_PADDING * 2,
        height: r.height + SPOTLIGHT_PADDING * 2,
      });
    }

    function loop() {
      if (cancelled) return;
      measure();
      frames += 1;
      if (frames < 30) raf = requestAnimationFrame(loop);
    }

    const target = step.selector ? document.querySelector<HTMLElement>(step.selector) : null;
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    raf = requestAnimationFrame(loop);

    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [stepIndex, step.selector]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
      else if (e.key === "ArrowLeft") setStepIndex((i) => Math.max(i - 1, 0));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const tooltipStyle = computeTooltipStyle(rect);

  return (
    <>
      <div className={styles.clickBlocker} />
      {rect ? (
        <div
          className={styles.spotlight}
          style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
        />
      ) : (
        <div className={styles.plainDark} />
      )}
      <div
        className={`${styles.tooltip} ${rect ? "" : styles.tooltipCentered}`}
        style={tooltipStyle}
        role="dialog"
        aria-modal="true"
        aria-label={step.title}
      >
        <div className={styles.tooltipStep}>
          Schritt {stepIndex + 1} von {STEPS.length}
        </div>
        <div className={styles.tooltipTitle}>{step.title}</div>
        <p className={styles.tooltipText}>{step.text}</p>
        <div className={styles.tooltipActions}>
          <button type="button" className={styles.skipButton} onClick={onClose}>
            Überspringen
          </button>
          <span className={styles.tooltipSpacer} />
          {!isFirst && (
            <button type="button" className={styles.backButton} onClick={() => setStepIndex((i) => i - 1)}>
              Zurück
            </button>
          )}
          <button
            type="button"
            className={styles.nextButton}
            onClick={() => (isLast ? onClose() : setStepIndex((i) => i + 1))}
          >
            {isLast ? "Fertig" : "Weiter"}
          </button>
        </div>
      </div>
    </>
  );
}

function computeTooltipStyle(rect: Rect | null): CSSProperties {
  if (!rect) return {};
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
  left = Math.max(12, Math.min(left, vw - TOOLTIP_WIDTH - 12));

  const spaceBelow = vh - (rect.top + rect.height);
  const placeBelow = spaceBelow > 200 || spaceBelow > rect.top;

  if (placeBelow) {
    return { left, top: rect.top + rect.height + TOOLTIP_GAP };
  }
  return { left, bottom: vh - rect.top + TOOLTIP_GAP };
}
