import { useEffect } from "react";
import styles from "./toast.module.css";

interface Props {
  message: string;
  onDismiss: () => void;
  durationMs?: number;
}

export default function Toast({ message, onDismiss, durationMs = 7000 }: Props) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [message, durationMs, onDismiss]);

  return (
    <div className={styles.toast} role="status">
      <span className={styles.toastText}>{message}</span>
      <button type="button" className={styles.toastClose} onClick={onDismiss} aria-label="Hinweis schließen">
        ×
      </button>
    </div>
  );
}
