import { useEffect, useRef } from "react";
import styles from "./checklist.module.css";

interface Props {
  uid: string;
  initialValue: string;
  placeholder?: string;
  onCommit: (value: string) => void;
  autoFocus?: boolean;
}

const DEBOUNCE_MS = 400;

/**
 * Unkontrolliertes Textarea: hält Tippen aus dem Store-Hotpath heraus.
 * Committed nach Debounce und zusätzlich sofort beim Verlassen des Felds.
 */
export default function CommentField({ uid, initialValue, placeholder, onCommit, autoFocus }: Props) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCommittedRef = useRef(initialValue);

  useEffect(() => {
    if (ref.current && ref.current.value !== initialValue && document.activeElement !== ref.current) {
      ref.current.value = initialValue;
      lastCommittedRef.current = initialValue;
    }
    // uid wechselt bei Re-Use derselben Komponente in einer Liste nicht (React key sorgt dafür),
    // daher reicht initialValue als Abhängigkeit für externe Änderungen (z.B. Import).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValue, uid]);

  function scheduleCommit() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(commitNow, DEBOUNCE_MS);
  }

  function commitNow() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const value = ref.current?.value ?? "";
    if (value !== lastCommittedRef.current) {
      lastCommittedRef.current = value;
      onCommit(value);
    }
  }

  return (
    <textarea
      ref={ref}
      className={styles.commentField}
      defaultValue={initialValue}
      placeholder={placeholder ?? "Kommentar…"}
      rows={1}
      autoFocus={autoFocus}
      onInput={scheduleCommit}
      onBlur={commitNow}
    />
  );
}
