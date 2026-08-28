import { useEffect, useRef, useState } from "react";
import { useAgendaStore, serializeCurrentDocument } from "../state/agendaStore";
import { readTextFile } from "../io/fileImport";
import { saveFile, buildFilename, type SaveOutcome } from "../io/fileDownload";
import { buildChecklistCsv, buildMaengelCsv } from "../io/csvExport";
import { useInstallPrompt } from "../onboarding/installPrompt";
import ConfirmDialog from "./ConfirmDialog";
import Toast from "./Toast";
import styles from "./layout.module.css";

type PendingAction =
  | { type: "import"; markdown: string; filename: string }
  | { type: "template" }
  | { type: "reset" }
  | null;

export default function Toolbar({ setTutorialOpen }: { setTutorialOpen: (open: boolean) => void }) {
  const doc = useAgendaStore((s) => s.doc);
  const loadFromMarkdown = useAgendaStore((s) => s.loadFromMarkdown);
  const loadTemplate = useAgendaStore((s) => s.loadTemplate);
  const reset = useAgendaStore((s) => s.reset);
  const markExported = useAgendaStore((s) => s.markExported);
  const editMode = useAgendaStore((s) => s.ui.editMode);
  const setEditMode = useAgendaStore((s) => s.setEditMode);
  const { canInstall, isInstalled, promptInstall } = useInstallPrompt();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pending, setPending] = useState<PendingAction>(null);
  const [savedIndicator, setSavedIndicator] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSavedIndicator(
        new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
      );
    }, 850);
    return () => clearTimeout(timer);
  }, [doc]);

  async function handleFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const text = await readTextFile(file);
    setPending({ type: "import", markdown: text, filename: file.name });
  }

  function confirmPending() {
    if (!pending) return;
    if (pending.type === "import") {
      loadFromMarkdown(pending.markdown);
      setToast(
        `„${pending.filename}" eingelesen. Änderungen werden erst durch „Agenda exportieren (.md)" in eine Datei geschrieben – erst dieser Export speichert sie dauerhaft (z. B. auf SharePoint).`,
      );
    }
    if (pending.type === "template") loadTemplate();
    if (pending.type === "reset") reset();
    setPending(null);
  }

  function announceExport(filename: string, outcome: SaveOutcome) {
    if (outcome === "cancelled") return;
    markExported();
    setToast(
      outcome === "picker"
        ? `„${filename}" gespeichert.`
        : `„${filename}" heruntergeladen – liegt im Downloads-Ordner deines Browsers. Tipp: In der Download-Anzeige deines Browsers lässt sich der Ordner meist direkt über „Im Ordner anzeigen" öffnen.`,
    );
  }

  async function exportMarkdown() {
    const filename = buildFilename(doc.titel, "md");
    const outcome = await saveFile(serializeCurrentDocument(), filename, "text/markdown;charset=utf-8", {
      description: "Markdown-Datei",
      accept: { "text/markdown": [".md"] },
    });
    announceExport(filename, outcome);
  }

  async function exportChecklistCsv() {
    const filename = buildFilename(doc.titel, "csv");
    const outcome = await saveFile(buildChecklistCsv(doc), filename, "text/csv;charset=utf-8", {
      description: "CSV-Datei",
      accept: { "text/csv": [".csv"] },
    });
    announceExport(filename, outcome);
  }

  async function exportMaengelCsv() {
    const filename = buildFilename(`${doc.titel}-maengel`, "csv");
    const outcome = await saveFile(buildMaengelCsv(doc), filename, "text/csv;charset=utf-8", {
      description: "CSV-Datei",
      accept: { "text/csv": [".csv"] },
    });
    announceExport(filename, outcome);
  }

  async function exportPdf() {
    setPdfBusy(true);
    try {
      const { generateAgendaPdf } = await import("../pdf/generatePdf");
      const outcome = await generateAgendaPdf(doc);
      announceExport(buildFilename(doc.titel, "pdf"), outcome);
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div className={styles.toolbar}>
      <span className={styles.brand}>VOB-Abnahme Helfer</span>

      <button
        type="button"
        data-tutorial="toolbar-files"
        className={styles.toolbarButton}
        onClick={() => fileInputRef.current?.click()}
      >
        Agenda importieren (.md)
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,text/markdown,text/plain"
        className={styles.hiddenFileInput}
        onChange={handleFilePicked}
      />
      <button type="button" className={styles.toolbarButton} onClick={exportMarkdown}>
        Agenda exportieren (.md)
      </button>
      <button type="button" className={styles.toolbarButton} onClick={exportChecklistCsv}>
        CSV
      </button>
      <button type="button" className={styles.toolbarButton} onClick={exportMaengelCsv}>
        Mängel-CSV
      </button>
      <button type="button" className={styles.toolbarButton} onClick={() => setPending({ type: "template" })}>
        Vorlage laden
      </button>
      <button type="button" className={styles.toolbarButton} onClick={() => setPending({ type: "reset" })}>
        Zurücksetzen
      </button>
      <button
        type="button"
        data-tutorial="toolbar-editmode"
        aria-pressed={editMode}
        className={editMode ? styles.toolbarButtonToggleActive : styles.toolbarButton}
        onClick={() => setEditMode(!editMode)}
      >
        {editMode ? "✎ Bearbeitungsmodus: an" : "✎ Bearbeitungsmodus"}
      </button>
      <button type="button" className={styles.toolbarButton} onClick={() => setTutorialOpen(true)}>
        ? Tutorial
      </button>
      {canInstall && !isInstalled && (
        <button type="button" className={styles.toolbarButton} onClick={() => void promptInstall()}>
          ⬇ Installieren
        </button>
      )}

      <span className={styles.toolbarSpacer} />

      {savedIndicator && <span className={styles.saveIndicator}>Gesichert {savedIndicator}</span>}
      <button
        type="button"
        data-tutorial="toolbar-pdf"
        className={styles.toolbarButtonPrimary}
        onClick={exportPdf}
        disabled={pdfBusy}
      >
        {pdfBusy ? "PDF wird erstellt…" : "PDF exportieren"}
      </button>

      {pending && (
        <ConfirmDialog
          title={
            pending.type === "import"
              ? "Agenda importieren?"
              : pending.type === "template"
                ? "Vorlage laden?"
                : "Alles zurücksetzen?"
          }
          body={
            pending.type === "import"
              ? "Der aktuelle Bearbeitungsstand wird durch die importierte Datei ersetzt. Der bisherige Stand wird vorher automatisch als Sicherung abgelegt."
              : pending.type === "template"
                ? "Die Beispiel-Vorlage wird geladen und ersetzt den aktuellen Bearbeitungsstand. Der bisherige Stand wird vorher automatisch als Sicherung abgelegt."
                : "Alle Punkte, Kommentare und Kopfdaten werden gelöscht. Der bisherige Stand wird vorher automatisch als Sicherung abgelegt."
          }
          confirmLabel="Fortfahren"
          onConfirm={confirmPending}
          onCancel={() => setPending(null)}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
