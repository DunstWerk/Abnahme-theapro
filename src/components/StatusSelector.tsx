import type { ItemStatus } from "../types/agenda";
import styles from "./checklist.module.css";

const OPTIONS: { status: ItemStatus; label: string; symbol: string; activeClass: string }[] = [
  { status: "offen", label: "offen", symbol: "○", activeClass: styles.statusButtonActiveOffen },
  { status: "iO", label: "i.O.", symbol: "✓", activeClass: styles.statusButtonActiveIo },
  { status: "mangel", label: "Mangel", symbol: "!", activeClass: styles.statusButtonActiveMangel },
  { status: "entfaellt", label: "entfällt", symbol: "–", activeClass: styles.statusButtonActiveEntfaellt },
];

interface Props {
  value: ItemStatus;
  onChange: (status: ItemStatus) => void;
}

export default function StatusSelector({ value, onChange }: Props) {
  return (
    <div className={styles.statusSelector} data-tutorial="status-selector" role="radiogroup" aria-label="Status">
      {OPTIONS.map((opt) => (
        <button
          key={opt.status}
          type="button"
          role="radio"
          aria-checked={value === opt.status}
          title={opt.label}
          className={`${styles.statusButton} ${value === opt.status ? opt.activeClass : ""}`}
          onClick={() => onChange(opt.status)}
        >
          {opt.symbol}
        </button>
      ))}
    </div>
  );
}
