import { useState } from "react";
import type { DragEvent, HTMLAttributes } from "react";

export type DropEdge = "before" | "after";

export interface RowDragProps {
  handleProps: HTMLAttributes<HTMLElement>;
  rowProps: HTMLAttributes<HTMLElement>;
  indicator: DropEdge | null;
  dragging: boolean;
}

interface DragReorder {
  getHandleProps: (uid: string) => HTMLAttributes<HTMLElement>;
  getRowProps: (uid: string) => HTMLAttributes<HTMLElement>;
  dropIndicator: (uid: string) => DropEdge | null;
  isDragging: (uid: string) => boolean;
}

/**
 * Generisches Drag & Drop-Verschieben innerhalb einer geordneten Liste (TOPs, Abschnitte oder
 * Punkte). Der Ziehgriff (getHandleProps) startet den Drag, die Zeile selbst (getRowProps) erkennt
 * das Drop-Ziel anhand der Cursor-Position (obere/untere Hälfte) – so bleibt Text in Eingabefeldern
 * der Zeile normal selektierbar, weil nur der kleine Griff `draggable` ist.
 *
 * targetIndex in onReorder ist bereits um die Entfernung des Quellelements bereinigt (Index in der
 * Liste NACH dem Herausnehmen) – passend zu moveToIndex() im Store.
 */
export function useDragReorder(items: { uid: string }[], onReorder: (uid: string, targetIndex: number) => void): DragReorder {
  const [draggedUid, setDraggedUid] = useState<string | null>(null);
  const [overUid, setOverUid] = useState<string | null>(null);
  const [overEdge, setOverEdge] = useState<DropEdge | null>(null);

  function reset() {
    setDraggedUid(null);
    setOverUid(null);
    setOverEdge(null);
  }

  return {
    getHandleProps: (uid) => ({
      draggable: true,
      onDragStart: (e: DragEvent) => {
        e.dataTransfer.effectAllowed = "move";
        // Firefox verlangt gesetzte Drag-Daten, sonst wird dragstart sofort abgebrochen.
        e.dataTransfer.setData("text/plain", uid);
        setDraggedUid(uid);
      },
      onDragEnd: reset,
    }),
    getRowProps: (uid) => ({
      onDragOver: (e: DragEvent) => {
        if (!draggedUid || draggedUid === uid) return;
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const edge: DropEdge = e.clientY - rect.top < rect.height / 2 ? "before" : "after";
        setOverUid(uid);
        setOverEdge(edge);
      },
      onDragLeave: () => setOverUid((cur) => (cur === uid ? null : cur)),
      onDrop: (e: DragEvent) => {
        e.preventDefault();
        if (!draggedUid) return;
        const fromIndex = items.findIndex((i) => i.uid === draggedUid);
        let targetIndex = items.findIndex((i) => i.uid === uid);
        if (fromIndex === -1 || targetIndex === -1) {
          reset();
          return;
        }
        if (overEdge === "after") targetIndex += 1;
        if (fromIndex < targetIndex) targetIndex -= 1;
        onReorder(draggedUid, targetIndex);
        reset();
      },
    }),
    dropIndicator: (uid) => (overUid === uid ? overEdge : null),
    isDragging: (uid) => draggedUid === uid,
  };
}

export function dragPropsFor(reorder: DragReorder, uid: string): RowDragProps {
  return {
    handleProps: reorder.getHandleProps(uid),
    rowProps: reorder.getRowProps(uid),
    indicator: reorder.dropIndicator(uid),
    dragging: reorder.isDragging(uid),
  };
}

/** Kombiniert dragging/drop-indicator-Klassen für den Zeilen-Container. `styles` ist das jeweilige
 * CSS-Module-Objekt (TopSection/SubSection/ChecklistItemRow teilen sich checklist.module.css). */
export function dragRowClass(styles: Record<string, string>, dragProps?: RowDragProps): string {
  if (!dragProps) return "";
  return [
    dragProps.dragging ? styles.dragging : "",
    dragProps.indicator === "before" ? styles.dropIndicatorBefore : "",
    dragProps.indicator === "after" ? styles.dropIndicatorAfter : "",
  ]
    .filter(Boolean)
    .join(" ");
}
