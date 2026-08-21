import { memo, useRef, useState } from "react";
import type { ChecklistItem, ItemStatus, Schweregrad } from "../types/agenda";
import { useAgendaStore } from "../state/agendaStore";
import StatusSelector from "./StatusSelector";
import CommentField from "./CommentField";
import MangelDetails from "./MangelDetails";
import DebouncedInput from "./DebouncedInput";
import EditControls from "./EditControls";
import ConfirmDialog from "./ConfirmDialog";
import styles from "./checklist.module.css";

interface Props {
  item: ChecklistItem;
  level: number;
  /** Nur bei level === 0 gesetzt – schaltet die Struktur-Steuerelemente frei (Bearbeitungsmodus). */
  parentTopUid?: string;
  parentSectionUid?: string | null;
  index?: number;
  total?: number;
}

function ChecklistItemRow({ item, level, parentTopUid, parentSectionUid, index, total }: Props) {
  const setItemStatus = useAgendaStore((s) => s.setItemStatus);
  const setItemKommentar = useAgendaStore((s) => s.setItemKommentar);
  const setItemSchweregrad = useAgendaStore((s) => s.setItemSchweregrad);
  const setItemFrist = useAgendaStore((s) => s.setItemFrist);
  const editMode = useAgendaStore((s) => s.ui.editMode);
  const isFocusTarget = useAgendaStore((s) => s.ui.focusUid === item.uid);
  const clearFocus = useAgendaStore((s) => s.clearFocus);
  const setItemText = useAgendaStore((s) => s.setItemText);
  const moveItem = useAgendaStore((s) => s.moveItem);
  const removeItem = useAgendaStore((s) => s.removeItem);
  const skipDeleteConfirm = useAgendaStore((s) => s.prefs.skipDeleteConfirm);
  const setSkipDeleteConfirm = useAgendaStore((s) => s.setSkipDeleteConfirm);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [confirming, setConfirming] = useState(false);

  const canEdit = editMode && level === 0 && parentTopUid !== undefined;

  function handleStatusChange(status: ItemStatus) {
    setItemStatus(item.uid, status);
    if (status === "mangel") {
      if (!item.schweregrad) setItemSchweregrad(item.uid, "wesentlich");
      setTimeout(() => {
        containerRef.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus();
      }, 0);
    }
  }

  function requestDelete() {
    if (skipDeleteConfirm) doDelete();
    else setConfirming(true);
  }

  function doDelete() {
    if (parentTopUid === undefined) return;
    removeItem(parentTopUid, parentSectionUid ?? null, item.uid);
  }

  return (
    <div ref={containerRef} className={level > 0 ? styles.itemChild : undefined}>
      <div className={styles.itemRow}>
        <StatusSelector value={item.status} onChange={handleStatusChange} />
        <div className={styles.itemMain}>
          {canEdit ? (
            <div className={styles.itemEditRow}>
              <DebouncedInput
                uid={item.uid}
                initialValue={item.text}
                className={styles.editInputItem}
                ariaLabel="Punkt-Text"
                autoFocus={isFocusTarget}
                onAutoFocused={() => clearFocus(item.uid)}
                onCommit={(text) => setItemText(item.uid, text)}
              />
              <EditControls
                canMoveUp={(index ?? 0) > 0}
                canMoveDown={(index ?? 0) < (total ?? 1) - 1}
                onMoveUp={() => moveItem(parentTopUid, parentSectionUid ?? null, item.uid, -1)}
                onMoveDown={() => moveItem(parentTopUid, parentSectionUid ?? null, item.uid, 1)}
                onDelete={requestDelete}
                ariaSubject={`Punkt "${item.text}"`}
              />
            </div>
          ) : (
            <div className={`${styles.itemText} ${item.status === "mangel" ? styles.itemTextMangel : ""}`}>
              {item.text}
            </div>
          )}
          <CommentField
            uid={item.uid}
            initialValue={item.kommentar}
            onCommit={(text) => setItemKommentar(item.uid, text)}
          />
          {item.status === "mangel" && (
            <MangelDetails
              schweregrad={item.schweregrad}
              frist={item.frist}
              onSchweregradChange={(sg: Schweregrad) => setItemSchweregrad(item.uid, sg)}
              onFristChange={(date) => setItemFrist(item.uid, date)}
            />
          )}
        </div>
      </div>
      {item.children.length > 0 && (
        <div className={styles.childList}>
          {item.children.map((child) => (
            <ChecklistItemRow key={child.uid} item={child} level={level + 1} />
          ))}
        </div>
      )}

      {confirming && (
        <ConfirmDialog
          title="Punkt löschen?"
          body={
            `„${item.text}" wird gelöscht.` +
            (item.children.length > 0 ? ` Die ${item.children.length} untergeordneten Punkte werden mitgelöscht.` : "") +
            (item.status === "mangel" ? " Der Punkt verschwindet dadurch auch aus der Mängelliste." : "")
          }
          suppressLabel="Diesen Hinweis in Zukunft nicht mehr anzeigen"
          confirmLabel="Punkt löschen"
          onConfirm={({ suppressFuture }) => {
            if (suppressFuture) setSkipDeleteConfirm(true);
            doDelete();
            setConfirming(false);
          }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}

export default memo(ChecklistItemRow);
