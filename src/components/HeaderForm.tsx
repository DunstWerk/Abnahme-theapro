import { HEADER_LABELS } from "../types/agenda";
import type { AgendaHeader } from "../types/agenda";
import { useAgendaStore } from "../state/agendaStore";
import styles from "./forms.module.css";

const FIELD_ORDER: (keyof Omit<AgendaHeader, "weitere">)[] = [
  "projekt",
  "gewerk",
  "auftragsnummer",
  "auftraggeber",
  "auftraggeberAdresse",
  "auftragnehmer",
  "fachplanung",
  "bearbeiter",
  "datum",
  "uhrzeit",
  "ort",
];

export default function HeaderForm() {
  const titel = useAgendaStore((s) => s.doc.titel);
  const header = useAgendaStore((s) => s.doc.header);
  const setTitel = useAgendaStore((s) => s.setTitel);
  const setHeaderField = useAgendaStore((s) => s.setHeaderField);

  return (
    <div className={styles.panel}>
      <input
        className={styles.titleInput}
        value={titel}
        onChange={(e) => setTitel(e.target.value)}
        aria-label="Dokumenttitel"
      />
      <div style={{ height: 12 }} />
      <div className={styles.grid}>
        {FIELD_ORDER.map((field) => (
          <label key={field} className={styles.field}>
            {HEADER_LABELS[field]}
            <input
              type={field === "datum" ? "date" : field === "uhrzeit" ? "time" : "text"}
              value={header[field]}
              onChange={(e) => setHeaderField(field, e.target.value)}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
