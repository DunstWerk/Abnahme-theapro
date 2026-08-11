import styles from "./forms.module.css";

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export default function HinweisBlock({ label, value, onChange }: Props) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle}>{label}</div>
      <textarea className={styles.textarea} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
