import type { HTMLAttributes } from "react";
import styles from "./checklist.module.css";

interface Props {
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  /** Für aria-labels, z.B. "TOP 3 – Sicherheit". */
  ariaSubject: string;
  /** Wenn gesetzt, wird davor ein Ziehgriff für Drag & Drop gerendert (siehe useDragReorder). */
  dragHandleProps?: HTMLAttributes<HTMLElement>;
}

function stop(e: React.MouseEvent, fn: () => void) {
  e.preventDefault();
  e.stopPropagation();
  fn();
}

/** Wiederverwendbare Ziehgriff/Verschieben/Löschen-Steuerelemente für TOP-, Abschnitts- und
 * Punkt-Zeilen im Bearbeitungsmodus. Stoppt Klick-Propagation, da die TOP-Variante innerhalb der
 * klickbaren .topHeader-Zeile sitzt. */
export default function EditControls({
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onDelete,
  ariaSubject,
  dragHandleProps,
}: Props) {
  return (
    <div className={styles.editControls}>
      {dragHandleProps && (
        <span
          {...dragHandleProps}
          className={styles.dragHandle}
          role="button"
          tabIndex={-1}
          aria-label={`${ariaSubject} verschieben (ziehen)`}
          onClick={(e) => e.stopPropagation()}
        >
          ⠿
        </span>
      )}
      <button
        type="button"
        className={styles.editButton}
        disabled={!canMoveUp}
        onClick={(e) => stop(e, onMoveUp)}
        aria-label={`${ariaSubject} nach oben verschieben`}
      >
        ▲
      </button>
      <button
        type="button"
        className={styles.editButton}
        disabled={!canMoveDown}
        onClick={(e) => stop(e, onMoveDown)}
        aria-label={`${ariaSubject} nach unten verschieben`}
      >
        ▼
      </button>
      <button
        type="button"
        className={styles.editButtonDanger}
        onClick={(e) => stop(e, onDelete)}
        aria-label={`${ariaSubject} löschen`}
      >
        ×
      </button>
    </div>
  );
}
