import { useMemo, useState } from "react";
import { useAgendaStore } from "../state/agendaStore";
import { compileMaengel } from "../state/selectors";
import { formatDateDe } from "../markdown/normalize";
import styles from "./maengel.module.css";

export default function MaengelPanel() {
  const doc = useAgendaStore((s) => s.doc);
  const [open, setOpen] = useState(true);
  const maengel = useMemo(() => compileMaengel(doc), [doc]);

  return (
    <div className={styles.panel}>
      <div className={styles.header} onClick={() => setOpen((o) => !o)}>
        <span className={styles.headerTitle}>Mängelliste (live)</span>
        <span className={styles.count}>{maengel.length}</span>
      </div>
      {open &&
        (maengel.length === 0 ? (
          <div className={styles.empty}>Es wurden keine Mängel festgestellt.</div>
        ) : (
          <div className={styles.body}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nr</th>
                  <th>Mangel</th>
                  <th>Ort/System</th>
                  <th>Einstufung</th>
                  <th>Frist</th>
                </tr>
              </thead>
              <tbody>
                {maengel.map((m) => (
                  <tr key={m.itemUid}>
                    <td>M{m.nr}</td>
                    <td>
                      {m.beschreibung}
                      {m.kommentar && <div style={{ color: "#777", fontStyle: "italic" }}>{m.kommentar}</div>}
                    </td>
                    <td>{m.ortLabel}</td>
                    <td className={m.schweregrad === "wesentlich" ? styles.wesentlich : undefined}>
                      {m.schweregrad ?? "–"}
                    </td>
                    <td>{formatDateDe(m.frist) || "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </div>
  );
}
