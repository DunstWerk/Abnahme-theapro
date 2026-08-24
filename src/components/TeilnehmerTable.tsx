import { useAgendaStore } from "../state/agendaStore";
import styles from "./forms.module.css";

export default function TeilnehmerTable() {
  const teilnehmer = useAgendaStore((s) => s.doc.teilnehmer);
  const addTeilnehmer = useAgendaStore((s) => s.addTeilnehmer);
  const updateTeilnehmer = useAgendaStore((s) => s.updateTeilnehmer);
  const removeTeilnehmer = useAgendaStore((s) => s.removeTeilnehmer);

  return (
    <div className={styles.panel} data-tutorial="teilnehmer">
      <div className={styles.panelTitle}>Teilnehmer</div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Firma / Funktion</th>
            <th>Rolle beim Termin</th>
            <th aria-hidden="true"></th>
          </tr>
        </thead>
        <tbody>
          {teilnehmer.map((t) => (
            <tr key={t.uid}>
              <td>
                <input value={t.name} onChange={(e) => updateTeilnehmer(t.uid, { name: e.target.value })} />
              </td>
              <td>
                <input
                  value={t.firmaFunktion}
                  onChange={(e) => updateTeilnehmer(t.uid, { firmaFunktion: e.target.value })}
                />
              </td>
              <td>
                <input value={t.rolle} onChange={(e) => updateTeilnehmer(t.uid, { rolle: e.target.value })} />
              </td>
              <td>
                <button
                  type="button"
                  className={styles.removeButton}
                  onClick={() => removeTeilnehmer(t.uid)}
                  aria-label={`Teilnehmer ${t.name || t.firmaFunktion} entfernen`}
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className={styles.addButton} onClick={addTeilnehmer}>
        + Teilnehmer hinzufügen
      </button>
    </div>
  );
}
