import { useState, type FormEvent } from "react";
import { checkPassword, markUnlocked } from "../auth/passwordGate";
import styles from "./passwordGate.module.css";

interface Props {
  onUnlock: () => void;
}

export default function PasswordGate({ onUnlock }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setChecking(true);
    const ok = await checkPassword(value);
    setChecking(false);
    if (ok) {
      markUnlocked();
      onUnlock();
    } else {
      setError(true);
      setValue("");
    }
  }

  return (
    <div className={styles.overlay}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.brand}>VOB-Abnahme Helfer</div>
        <p className={styles.hint}>Bitte Passwort eingeben, um fortzufahren.</p>
        <input
          type="password"
          className={styles.input}
          value={value}
          autoFocus
          onChange={(e) => {
            setValue(e.target.value);
            setError(false);
          }}
          aria-label="Passwort"
        />
        {error && <div className={styles.error}>Falsches Passwort.</div>}
        <button type="submit" className={styles.button} disabled={checking || value === ""}>
          Öffnen
        </button>
      </form>
    </div>
  );
}
