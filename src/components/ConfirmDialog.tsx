import { useState } from "react";
import styles from "./dialog.module.css";

interface Props {
  title: string;
  body: string;
  confirmLabel?: string;
  /** Wenn gesetzt, erscheint eine "nicht mehr anzeigen"-Checkbox mit diesem Text. */
  suppressLabel?: string;
  onConfirm: (result: { suppressFuture: boolean }) => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ title, body, confirmLabel = "Fortfahren", suppressLabel, onConfirm, onCancel }: Props) {
  const [suppress, setSuppress] = useState(false);

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true">
        <div className={styles.dialogTitle}>{title}</div>
        <div className={styles.dialogBody}>{body}</div>
        {suppressLabel && (
          <label className={styles.dialogSuppressRow}>
            <input type="checkbox" checked={suppress} onChange={(e) => setSuppress(e.target.checked)} />
            {suppressLabel}
          </label>
        )}
        <div className={styles.dialogActions}>
          <button type="button" className={styles.buttonSecondary} onClick={onCancel}>
            Abbrechen
          </button>
          <button
            type="button"
            className={styles.buttonPrimary}
            onClick={() => onConfirm({ suppressFuture: suppressLabel != null && suppress })}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
