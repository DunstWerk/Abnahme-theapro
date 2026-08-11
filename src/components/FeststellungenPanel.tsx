import { useState } from "react";
import { useAgendaStore } from "../state/agendaStore";
import DebouncedInput from "./DebouncedInput";
import CommentField from "./CommentField";
import formStyles from "./forms.module.css";
import styles from "./maengel.module.css";

export default function FeststellungenPanel() {
  const feststellungen = useAgendaStore((s) => s.doc.feststellungen);
  const addFeststellung = useAgendaStore((s) => s.addFeststellung);
  const updateFeststellung = useAgendaStore((s) => s.updateFeststellung);
  const removeFeststellung = useAgendaStore((s) => s.removeFeststellung);
  const [open, setOpen] = useState(true);

  return (
    <div className={styles.panel}>
      <div className={styles.header} onClick={() => setOpen((o) => !o)}>
        <span className={styles.headerTitle}>Feststellungen und Festlegungen (Anlage 2)</span>
        <span className={styles.count}>{feststellungen.length}</span>
      </div>
      {open && (
        <div className={styles.body}>
          <table className={formStyles.table}>
            <thead>
              <tr>
                <th>Lfd. Nr.</th>
                <th>Bezeichnung</th>
                <th>Beschreibung</th>
                <th>Zuständig</th>
                <th>Frist</th>
                <th aria-hidden="true"></th>
              </tr>
            </thead>
            <tbody>
              {feststellungen.map((f, idx) => (
                <tr key={f.uid}>
                  <td>{idx + 1}</td>
                  <td>
                    <DebouncedInput
                      uid={f.uid}
                      initialValue={f.bezeichnung}
                      onCommit={(val) => updateFeststellung(f.uid, { bezeichnung: val })}
                    />
                  </td>
                  <td>
                    <CommentField
                      uid={f.uid}
                      initialValue={f.beschreibung}
                      placeholder="Beschreibung…"
                      onCommit={(val) => updateFeststellung(f.uid, { beschreibung: val })}
                    />
                  </td>
                  <td>
                    <DebouncedInput
                      uid={f.uid}
                      initialValue={f.zustaendig}
                      onCommit={(val) => updateFeststellung(f.uid, { zustaendig: val })}
                    />
                  </td>
                  <td>
                    <DebouncedInput
                      uid={f.uid}
                      type="date"
                      initialValue={f.frist ?? ""}
                      onCommit={(val) => updateFeststellung(f.uid, { frist: val === "" ? null : val })}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className={formStyles.removeButton}
                      onClick={() => removeFeststellung(f.uid)}
                      aria-label={`Feststellung ${f.bezeichnung} entfernen`}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className={formStyles.addButton} onClick={addFeststellung}>
            + Feststellung hinzufügen
          </button>
        </div>
      )}
    </div>
  );
}
