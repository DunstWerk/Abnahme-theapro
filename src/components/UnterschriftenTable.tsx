import { useAgendaStore } from "../state/agendaStore";
import { formatDateDe } from "../markdown/normalize";
import DebouncedInput from "./DebouncedInput";
import styles from "./forms.module.css";

export default function UnterschriftenTable() {
  const header = useAgendaStore((s) => s.doc.header);
  const unterschriften = useAgendaStore((s) => s.doc.niederschrift.unterschriften);
  const addUnterschrift = useAgendaStore((s) => s.addUnterschrift);
  const updateUnterschrift = useAgendaStore((s) => s.updateUnterschrift);
  const removeUnterschrift = useAgendaStore((s) => s.removeUnterschrift);

  const vorschau = `${formatDateDe(header.datum) || "…"}, ${header.bearbeiter || "…"}`;

  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle}>Unterschriften</div>
      <p style={{ fontSize: "0.85rem", color: "#777", marginTop: 0 }}>
        Wird im PDF automatisch vorangestellt: <em>{vorschau}</em> (aus Datum/Bearbeiter der Rahmendaten)
      </p>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Funktion</th>
            <th aria-hidden="true"></th>
          </tr>
        </thead>
        <tbody>
          {unterschriften.map((u) => (
            <tr key={u.uid}>
              <td>
                <DebouncedInput uid={u.uid} initialValue={u.name} onCommit={(val) => updateUnterschrift(u.uid, { name: val })} />
              </td>
              <td>
                <DebouncedInput
                  uid={u.uid}
                  initialValue={u.funktion}
                  placeholder="z. B. AG, AN, Fachplanung"
                  onCommit={(val) => updateUnterschrift(u.uid, { funktion: val })}
                />
              </td>
              <td>
                <button
                  type="button"
                  className={styles.removeButton}
                  onClick={() => removeUnterschrift(u.uid)}
                  aria-label={`Unterschrift ${u.name} entfernen`}
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className={styles.addButton} onClick={addUnterschrift}>
        + Unterschrift hinzufügen
      </button>
    </div>
  );
}
