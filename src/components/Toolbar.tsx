import { useEffect, useRef, useState } from "react";
import { useAgendaStore, serializeCurrentDocument } from "../state/agendaStore";
import { readTextFile } from "../io/fileImport";
import { downloadTextFile, buildFilename } from "../io/fileDownload";
import { buildChecklistCsv, buildMaengelCsv } from "../io/csvExport";
import ConfirmDialog from "./ConfirmDialog";
import styles from "./layout.module.css";

type PendingAction = { type: "import"; markdown: string } | { type: "template" } | { type: "reset" } | null;

interface Props {
  setTutorialOpen: (open: boolean) => void;
}

export default function Toolbar({ setTutorialOpen }: Props) {
  const doc = useAgendaStore((s) => s.doc);
  const loadFromMarkdown = useAgendaStore((s) => s.loadFromMarkdown);
  const loadTemplate = useAgendaStore((s) => s.loadTemplate);
  const reset = useAgendaStore((s) => s.reset);
  const markExported = useAgendaStore((s) => s.markExported);
  const editMode = useAgendaStore((s) => s.ui.editMode);
  const setEditMode = useAgendaStore((s) => s.setEditMode);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pending, setPending] = useState<PendingAction>(null);
  const [savedIndicator, setSavedIndicator] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

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
    setPending({ type: "import", markdown: text });
  }

  function confirmPending() {
    if (!pending) return;
    if (pending.type === "import") loadFromMarkdown(pending.markdown);
    if (pending.type === "template") loadTemplate();
    if (pending.type === "reset") reset();
    setPending(null);
  }

  function exportMarkdown() {
    downloadTextFile(serializeCurrentDocument(), buildFilename(doc.titel, "md"), "text/markdown;charset=utf-8");
    markExported();
  }

  function exportChecklistCsv() {
    downloadTextFile(buildChecklistCsv(doc), buildFilename(doc.titel, "csv"), "text/csv;charset=utf-8");
  }

  function exportMaengelCsv() {
    downloadTextFile(buildMaengelCsv(doc), buildFilename(`${doc.titel}-maengel`, "csv"), "text/csv;charset=utf-8");
  }

  async function exportPdf() {
    setPdfBusy(true);
    try {
      const { generateAgendaPdf } = await import("../pdf/generatePdf");
      await generateAgendaPdf(doc);
      markExported();
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
    </div>
  );
}
