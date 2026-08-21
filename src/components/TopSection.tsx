import { memo, useMemo, useState } from "react";
import type { Top } from "../types/agenda";
import { useAgendaStore } from "../state/agendaStore";
import { computeTopProgress, filterTop } from "../state/selectors";
import ChecklistItemRow from "./ChecklistItemRow";
import SubSection from "./SubSection";
import DebouncedInput from "./DebouncedInput";
import EditControls from "./EditControls";
import ConfirmDialog from "./ConfirmDialog";
import { useDragReorder, dragPropsFor, dragRowClass, type RowDragProps } from "./useDragReorder";
import styles from "./checklist.module.css";

interface Props {
  top: Top;
  index: number;
  total: number;
  dragProps?: RowDragProps;
}

function TopSection({ top, index, total, dragProps }: Props) {
  const collapsed = useAgendaStore((s) => s.ui.collapsedTops.has(top.uid));
  const filter = useAgendaStore((s) => s.ui.filter);
  const toggle = useAgendaStore((s) => s.toggleTopCollapsed);
  const editMode = useAgendaStore((s) => s.ui.editMode);
  const isFocusTarget = useAgendaStore((s) => s.ui.focusUid === top.uid);
  const clearFocus = useAgendaStore((s) => s.clearFocus);
  const updateTop = useAgendaStore((s) => s.updateTop);
  const moveTop = useAgendaStore((s) => s.moveTop);
  const removeTop = useAgendaStore((s) => s.removeTop);
  const addSection = useAgendaStore((s) => s.addSection);
  const addItem = useAgendaStore((s) => s.addItem);
  const reorderSection = useAgendaStore((s) => s.reorderSection);
  const reorderItem = useAgendaStore((s) => s.reorderItem);
  const [confirming, setConfirming] = useState(false);

  const progress = useMemo(() => computeTopProgress(top), [top]);
  const visibleTop = useMemo(() => (filter === "alle" ? top : filterTop(top, filter)), [top, filter]);
  const rendered = editMode ? top : visibleTop;
  const isEmptyAfterFilter =
    !editMode && filter !== "alle" && visibleTop.items.length === 0 && visibleTop.sections.every((s) => s.items.length === 0);

  const itemDrag = useDragReorder(rendered.items, (uid, targetIndex) => reorderItem(top.uid, null, uid, targetIndex));
  const sectionDrag = useDragReorder(rendered.sections, (uid, targetIndex) => reorderSection(top.uid, uid, targetIndex));

  if (isEmptyAfterFilter) return null;

  const heading = top.nummer != null ? `TOP ${top.nummer} – ${top.titel}` : top.titel;

  return (
    <section
      id={`top-${top.uid}`}
      className={`${styles.topSection} ${dragRowClass(styles, dragProps)}`.trim()}
      {...(dragProps?.rowProps ?? {})}
    >
      <div className={editMode ? styles.topHeaderEdit : styles.topHeader} onClick={editMode ? undefined : () => toggle(top.uid)}>
        {editMode ? (
          <div className={styles.topTitleEdit}>
            <span className={styles.topNummerStatic}>TOP {top.nummer}</span>
            <DebouncedInput
              uid={top.uid}
              initialValue={top.titel}
              className={styles.editInputTitel}
              ariaLabel="TOP-Titel"
              autoFocus={isFocusTarget}
              onAutoFocused={() => clearFocus(top.uid)}
              onCommit={(v) => updateTop(top.uid, v)}
            />
          </div>
        ) : (
          <span className={styles.topTitle}>{heading}</span>
        )}
        <div className={styles.topMeta}>
          {editMode && (
            <EditControls
              canMoveUp={index > 0}
              canMoveDown={index < total - 1}
              onMoveUp={() => moveTop(top.uid, -1)}
              onMoveDown={() => moveTop(top.uid, 1)}
              onDelete={() => setConfirming(true)}
              ariaSubject={`TOP "${heading}"`}
              dragHandleProps={dragProps?.handleProps}
            />
          )}
          {progress.mangelCount > 0 && <span className={styles.mangelPill}>{progress.mangelCount} Mangel</span>}
          <span className={styles.progressPill}>
            {progress.bearbeitet}/{progress.total}
          </span>
          <span
            className={`${styles.chevron} ${!collapsed ? styles.chevronOpen : ""}`}
            onClick={
              editMode
                ? (e) => {
                    e.stopPropagation();
                    toggle(top.uid);
                  }
                : undefined
            }
            role={editMode ? "button" : undefined}
            aria-label={editMode ? "Ein-/Ausklappen" : undefined}
          >
            ▶
          </span>
        </div>
      </div>
      {!collapsed && (
        <div className={styles.topBody}>
          {rendered.preamble.length > 0 && <div className={styles.preamble}>{rendered.preamble.join(" ")}</div>}
          {rendered.items.map((item, i) => (
            <ChecklistItemRow
              key={item.uid}
              item={item}
              level={0}
              parentTopUid={top.uid}
              parentSectionUid={null}
              index={i}
              total={rendered.items.length}
              dragProps={editMode ? dragPropsFor(itemDrag, item.uid) : undefined}
            />
          ))}
          {rendered.sections.map((section, i) => (
            <SubSection
              key={section.uid}
              section={section}
              topUid={top.uid}
              index={i}
              total={rendered.sections.length}
              dragProps={editMode ? dragPropsFor(sectionDrag, section.uid) : undefined}
            />
          ))}
          {editMode && (
            <div className={styles.addButtonRow}>
              <button type="button" className={styles.addStructureButton} onClick={() => addItem(top.uid, null)}>
                + Punkt hinzufügen
              </button>
              <button type="button" className={styles.addStructureButton} onClick={() => addSection(top.uid)}>
                + Abschnitt hinzufügen
              </button>
            </div>
          )}
          {editMode && rendered.items.length === 0 && rendered.sections.length === 0 && (
            <div className={styles.emptyHint}>Noch keine Punkte oder Abschnitte.</div>
          )}
        </div>
      )}

      {confirming && (
        <ConfirmDialog
          title="TOP löschen?"
          body={`„${heading}" wird mit allen Abschnitten und ${progress.total} Punkten gelöscht${
            progress.mangelCount > 0 ? ` (davon ${progress.mangelCount} als Mangel erfasst – diese verschwinden aus der Mängelliste)` : ""
          }. Dieser Schritt kann nicht rückgängig gemacht werden.`}
          confirmLabel="TOP löschen"
          onConfirm={() => {
            removeTop(top.uid);
            setConfirming(false);
          }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </section>
  );
}

export default memo(TopSection);
