import { useMemo } from "react";
import { useAgendaStore } from "../state/agendaStore";
import { computeTopProgress, type ItemFilter } from "../state/selectors";
import styles from "./layout.module.css";

const FILTERS: { value: ItemFilter; label: string }[] = [
  { value: "alle", label: "Alle" },
  { value: "offen", label: "Offen" },
  { value: "mangel", label: "Mängel" },
];

export default function TopNav() {
  const tops = useAgendaStore((s) => s.doc.tops);
  const filter = useAgendaStore((s) => s.ui.filter);
  const setFilter = useAgendaStore((s) => s.setFilter);
  const editMode = useAgendaStore((s) => s.ui.editMode);

  const progressByTop = useMemo(() => tops.map((t) => computeTopProgress(t)), [tops]);

  return (
    <nav className={styles.nav}>
      <div className={styles.navPanel}>
        {!editMode && (
          <div className={styles.filterRow}>
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                className={filter === f.value ? styles.filterChipActive : styles.filterChip}
                onClick={() => setFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
        <ul className={styles.navList}>
          {tops.map((top, idx) => {
            const heading = top.nummer != null ? `TOP ${top.nummer}` : top.titel;
            const progress = progressByTop[idx];
            return (
              <li key={top.uid} className={styles.navItem}>
                <a href={`#top-${top.uid}`} title={top.titel}>
                  <span>{heading}</span>
                  <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    {progress.mangelCount > 0 && <span className={styles.navBadge}>{progress.mangelCount}</span>}
                    <span className={styles.navProgress}>
                      {progress.bearbeitet}/{progress.total}
                    </span>
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
