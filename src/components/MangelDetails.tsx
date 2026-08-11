import type { Schweregrad } from "../types/agenda";
import styles from "./checklist.module.css";

interface Props {
  schweregrad: Schweregrad | null;
  frist: string | null;
  onSchweregradChange: (sg: Schweregrad) => void;
  onFristChange: (date: string | null) => void;
}

export default function MangelDetails({ schweregrad, frist, onSchweregradChange, onFristChange }: Props) {
  return (
    <div className={styles.mangelDetails}>
      <label className={styles.mangelField}>
        Schweregrad
        <select
          value={schweregrad ?? "wesentlich"}
          onChange={(e) => onSchweregradChange(e.target.value as Schweregrad)}
        >
          <option value="wesentlich">wesentlich</option>
          <option value="unwesentlich">unwesentlich</option>
        </select>
      </label>
      <label className={styles.mangelField}>
        Frist
        <input
          type="date"
          value={frist ?? ""}
          onChange={(e) => onFristChange(e.target.value === "" ? null : e.target.value)}
        />
      </label>
    </div>
  );
}
