import { useEffect, useRef } from "react";

interface Props {
  uid: string;
  initialValue: string;
  placeholder?: string;
  type?: "text" | "date";
  className?: string;
  ariaLabel?: string;
  onCommit: (value: string) => void;
  /** Fokussiert (und selektiert den Inhalt) beim Mount – für frisch im Bearbeitungsmodus angelegte Einträge. */
  autoFocus?: boolean;
  /** Feuert einmalig nach dem Auto-Fokus, damit der Aufrufer z.B. ui.focusUid zurücksetzen kann. */
  onAutoFocused?: () => void;
}

const DEBOUNCE_MS = 400;

/**
 * Einzeiliges Pendant zu CommentField.tsx: unkontrolliertes <input>, hält Tippen
 * aus dem Store-Hotpath heraus. Committed nach Debounce und sofort beim Verlassen des Felds.
 * Enter committed sofort, Escape verwirft die Änderung – beides relevant für die
 * Inline-Editierung von TOP-/Abschnitts-Titeln und Punkt-Texten im Bearbeitungsmodus.
 */
export default function DebouncedInput({
  uid,
  initialValue,
  placeholder,
  type = "text",
  className,
  ariaLabel,
  onCommit,
  autoFocus,
  onAutoFocused,
}: Props) {
  const ref = useRef<HTMLInputElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCommittedRef = useRef(initialValue);

  useEffect(() => {
    if (ref.current && ref.current.value !== initialValue && document.activeElement !== ref.current) {
      ref.current.value = initialValue;
      lastCommittedRef.current = initialValue;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValue, uid]);

  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus();
      ref.current.select();
      onAutoFocused?.();
    }
    // Nur beim Mount relevant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      commitNow();
      ref.current?.blur();
    } else if (e.key === "Escape") {
      if (ref.current) ref.current.value = lastCommittedRef.current;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      ref.current?.blur();
    }
  }

  return (
    <input
      ref={ref}
      type={type}
      className={className}
      defaultValue={initialValue}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onInput={scheduleCommit}
      onBlur={commitNow}
      onKeyDown={handleKeyDown}
    />
  );
}
