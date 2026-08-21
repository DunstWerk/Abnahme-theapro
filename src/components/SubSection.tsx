import { memo, useState } from "react";
import type { SubSection as SubSectionType } from "../types/agenda";
import { useAgendaStore } from "../state/agendaStore";
import ChecklistItemRow from "./ChecklistItemRow";
import DebouncedInput from "./DebouncedInput";
import EditControls from "./EditControls";
import ConfirmDialog from "./ConfirmDialog";
import styles from "./checklist.module.css";

interface Props {
  section: SubSectionType;
  topUid: string;
  index: number;
  total: number;
}

function SubSection({ section, topUid, index, total }: Props) {
  const editMode = useAgendaStore((s) => s.ui.editMode);
  const isFocusTarget = useAgendaStore((s) => s.ui.focusUid === section.uid);
  const clearFocus = useAgendaStore((s) => s.clearFocus);
  const updateSection = useAgendaStore((s) => s.updateSection);
  const moveSection = useAgendaStore((s) => s.moveSection);
  const removeSection = useAgendaStore((s) => s.removeSection);
  const addItem = useAgendaStore((s) => s.addItem);
  const skipDeleteConfirm = useAgendaStore((s) => s.prefs.skipDeleteConfirm);
  const setSkipDeleteConfirm = useAgendaStore((s) => s.setSkipDeleteConfirm);
  const [confirming, setConfirming] = useState(false);

  const heading = section.nummer != null ? `${section.nummer} ${section.titel}` : section.titel;

  function requestDelete() {
    if (skipDeleteConfirm) removeSection(topUid, section.uid);
    else setConfirming(true);
  }

  return (
    <div className={styles.subSection}>
      {editMode ? (
        <div className={styles.subSectionTitleEdit}>
          <DebouncedInput
            uid={`${section.uid}:nr`}
            initialValue={section.nummer ?? ""}
            placeholder="Nr."
            className={styles.editInputNummer}
            ariaLabel="Abschnittsnummer"
            onCommit={(v) => updateSection(topUid, section.uid, { nummer: v })}
          />
          <DebouncedInput
            uid={section.uid}
            initialValue={section.titel}
            className={styles.editInputSub}
            ariaLabel="Abschnittstitel"
            autoFocus={isFocusTarget}
            onAutoFocused={() => clearFocus(section.uid)}
            onCommit={(v) => updateSection(topUid, section.uid, { titel: v })}
          />
          <EditControls
            canMoveUp={index > 0}
            canMoveDown={index < total - 1}
            onMoveUp={() => moveSection(topUid, section.uid, -1)}
            onMoveDown={() => moveSection(topUid, section.uid, 1)}
            onDelete={requestDelete}
            ariaSubject={`Abschnitt "${heading}"`}
          />
        </div>
      ) : (
        <div className={styles.subSectionTitle}>{heading}</div>
      )}
      {section.preamble.length > 0 && (
        <div className={styles.preamble}>{section.preamble.join(" ")}</div>
      )}
      {section.items.map((item, i) => (
        <ChecklistItemRow
          key={item.uid}
          item={item}
          level={0}
          parentTopUid={topUid}
          parentSectionUid={section.uid}
          index={i}
          total={section.items.length}
        />
      ))}
      {editMode && (
        <div className={styles.addButtonRow}>
          <button type="button" className={styles.addStructureButton} onClick={() => addItem(topUid, section.uid)}>
            + Punkt hinzufügen
          </button>
        </div>
      )}
      {editMode && section.items.length === 0 && <div className={styles.emptyHint}>Noch keine Punkte.</div>}

      {confirming && (
        <ConfirmDialog
          title="Abschnitt löschen?"
          body={`„${heading}" wird mit allen ${section.items.length} Punkten gelöscht. Dieser Schritt kann nicht rückgängig gemacht werden.`}
          suppressLabel="Diesen Hinweis in Zukunft nicht mehr anzeigen"
          confirmLabel="Abschnitt löschen"
          onConfirm={({ suppressFuture }) => {
            if (suppressFuture) setSkipDeleteConfirm(true);
            removeSection(topUid, section.uid);
            setConfirming(false);
          }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}

export default memo(SubSection);
