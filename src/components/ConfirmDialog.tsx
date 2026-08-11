import styles from "./dialog.module.css";

interface Props {
  title: string;
  body: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ title, body, confirmLabel = "Fortfahren", onConfirm, onCancel }: Props) {
  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true">
        <div className={styles.dialogTitle}>{title}</div>
        <div className={styles.dialogBody}>{body}</div>
        <div className={styles.dialogActions}>
          <button type="button" className={styles.buttonSecondary} onClick={onCancel}>
            Abbrechen
          </button>
          <button type="button" className={styles.buttonPrimary} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
