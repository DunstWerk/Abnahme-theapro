import { useEffect, useRef } from "react";

interface Props {
  uid: string;
  initialValue: string;
  placeholder?: string;
  type?: "text" | "date";
  className?: string;
  onCommit: (value: string) => void;
}

const DEBOUNCE_MS = 400;

/**
 * Einzeiliges Pendant zu CommentField.tsx: unkontrolliertes <input>, hält Tippen
 * aus dem Store-Hotpath heraus. Committed nach Debounce und sofort beim Verlassen des Felds.
 */
export default function DebouncedInput({ uid, initialValue, placeholder, type = "text", className, onCommit }: Props) {
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
    <input
      ref={ref}
      type={type}
      className={className}
      defaultValue={initialValue}
      placeholder={placeholder}
      onInput={scheduleCommit}
      onBlur={commitNow}
    />
  );
}
