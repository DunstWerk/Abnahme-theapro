import type { ReactNode } from "react";
import { useAgendaStore } from "../state/agendaStore";
import type { VerjaehrungListe } from "../state/agendaStore";
import DebouncedInput from "./DebouncedInput";
import styles from "./forms.module.css";

interface Props {
  titel: string;
  liste: VerjaehrungListe;
  children?: ReactNode;
}

export default function VerjaehrungsfristenTable({ titel, liste, children }: Props) {
  const rows = useAgendaStore((s) => s.doc.niederschrift[liste]);
  const addVerjaehrung = useAgendaStore((s) => s.addVerjaehrung);
  const updateVerjaehrung = useAgendaStore((s) => s.updateVerjaehrung);
  const removeVerjaehrung = useAgendaStore((s) => s.removeVerjaehrung);

  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle}>{titel}</div>
      {children}
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Nr.</th>
            <th>Anlagenteil</th>
            <th>Beginn</th>
            <th>Ende</th>
            <th aria-hidden="true"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((v) => (
            <tr key={v.uid}>
              <td>
                <DebouncedInput uid={v.uid} initialValue={v.nr} onCommit={(val) => updateVerjaehrung(liste, v.uid, { nr: val })} />
              </td>
              <td>
                <DebouncedInput
                  uid={v.uid}
                  initialValue={v.anlagenteil}
                  onCommit={(val) => updateVerjaehrung(liste, v.uid, { anlagenteil: val })}
                />
              </td>
              <td>
                <DebouncedInput
                  uid={v.uid}
                  initialValue={v.beginn}
                  onCommit={(val) => updateVerjaehrung(liste, v.uid, { beginn: val })}
                />
              </td>
              <td>
                <DebouncedInput uid={v.uid} initialValue={v.ende} onCommit={(val) => updateVerjaehrung(liste, v.uid, { ende: val })} />
              </td>
              <td>
                <button
                  type="button"
                  className={styles.removeButton}
                  onClick={() => removeVerjaehrung(liste, v.uid)}
                  aria-label="Zeile entfernen"
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className={styles.addButton} onClick={() => addVerjaehrung(liste)}>
        + Zeile hinzufügen
      </button>
    </div>
  );
}
