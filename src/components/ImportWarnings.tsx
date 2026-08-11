import { useAgendaStore } from "../state/agendaStore";
import styles from "./dialog.module.css";

export default function ImportWarnings() {
  const warnings = useAgendaStore((s) => s.importWarnings);
  const dismiss = useAgendaStore((s) => s.dismissImportWarnings);

  if (warnings.length === 0) return null;

  return (
    <div className={styles.warningsBox}>
      <div className={styles.warningsTitle}>
        <span>{warnings.length} Hinweis(e) beim Einlesen der Datei</span>
        <button type="button" className={styles.dismissButton} onClick={dismiss}>
          ausblenden
        </button>
      </div>
      <ul className={styles.warningsList}>
        {warnings.map((w, idx) => (
          <li key={idx}>
            Zeile {w.line}: {w.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
