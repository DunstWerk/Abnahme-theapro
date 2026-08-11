import { memo, useMemo } from "react";
import type { Top } from "../types/agenda";
import { useAgendaStore } from "../state/agendaStore";
import { computeTopProgress, filterTop } from "../state/selectors";
import ChecklistItemRow from "./ChecklistItemRow";
import SubSection from "./SubSection";
import styles from "./checklist.module.css";

interface Props {
  top: Top;
}

function TopSection({ top }: Props) {
  const collapsed = useAgendaStore((s) => s.ui.collapsedTops.has(top.uid));
  const filter = useAgendaStore((s) => s.ui.filter);
  const toggle = useAgendaStore((s) => s.toggleTopCollapsed);

  const progress = useMemo(() => computeTopProgress(top), [top]);
  const visibleTop = useMemo(() => (filter === "alle" ? top : filterTop(top, filter)), [top, filter]);
  const isEmptyAfterFilter =
    filter !== "alle" && visibleTop.items.length === 0 && visibleTop.sections.every((s) => s.items.length === 0);

  if (isEmptyAfterFilter) return null;

  const heading = top.nummer != null ? `TOP ${top.nummer} – ${top.titel}` : top.titel;

  return (
    <section id={`top-${top.uid}`} className={styles.topSection}>
      <div className={styles.topHeader} onClick={() => toggle(top.uid)}>
        <span className={styles.topTitle}>{heading}</span>
        <div className={styles.topMeta}>
          {progress.mangelCount > 0 && <span className={styles.mangelPill}>{progress.mangelCount} Mangel</span>}
          <span className={styles.progressPill}>
            {progress.bearbeitet}/{progress.total}
          </span>
          <span className={`${styles.chevron} ${!collapsed ? styles.chevronOpen : ""}`}>▶</span>
        </div>
      </div>
      {!collapsed && (
        <div className={styles.topBody}>
          {visibleTop.preamble.length > 0 && <div className={styles.preamble}>{visibleTop.preamble.join(" ")}</div>}
          {visibleTop.items.map((item) => (
            <ChecklistItemRow key={item.uid} item={item} level={0} />
          ))}
          {visibleTop.sections.map((section) => (
            <SubSection key={section.uid} section={section} />
          ))}
        </div>
      )}
    </section>
  );
}

export default memo(TopSection);
