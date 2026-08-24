import { useMemo } from "react";
import type { AbnahmeErgebnisArt, Termintreue } from "../types/agenda";
import { abnahmeWort, ergebnisLabel } from "../types/agenda";
import { useAgendaStore } from "../state/agendaStore";
import { countMaengelBySchweregrad, maengelNummernBereich } from "../state/selectors";
import DebouncedInput from "./DebouncedInput";
import styles from "./forms.module.css";

const ERGEBNIS_ARTEN: AbnahmeErgebnisArt[] = ["ohneMaengel", "nichtAbgenommen", "mitMaengeln"];

const TERMINTREUE_OPTIONS: { value: Termintreue | "offen"; label: string }[] = [
  { value: "termingerecht", label: "termingerecht fertiggestellt." },
  {
    value: "nichtTermingerecht",
    label: "nicht termingerecht fertiggestellt. Der AG behält sich vor, eine ggfls. vereinbarte Vertragsstrafe geltend zu machen.",
  },
  { value: "offen", label: "noch nicht festgelegt." },
];

export default function AbnahmeErgebnisForm() {
  const doc = useAgendaStore((s) => s.doc);
  const setField = useAgendaStore((s) => s.setNiederschriftField);
  const n = doc.niederschrift;

  const bereich = useMemo(() => maengelNummernBereich(doc), [doc]);
  const counts = useMemo(() => countMaengelBySchweregrad(doc), [doc]);

  return (
    <div className={styles.panel} data-tutorial="abnahmeergebnis">
      <div className={styles.panelTitle}>Ergebnis der {abnahmeWort(doc, true)}</div>

      <div className={styles.radioGroup}>
        <div style={{ fontSize: "0.85rem", color: "#555", marginBottom: 6 }}>3.1 &nbsp;Die Leistung wurde</div>
        {ERGEBNIS_ARTEN.map((art) => (
          <label key={art} className={styles.radioRow}>
            <input
              type="radio"
              name="ergebnis"
              checked={(n.ergebnis ?? "offen") === art}
              onChange={() => setField("ergebnis", art)}
            />
            {ergebnisLabel(art, doc, bereich)}
          </label>
        ))}
        <label className={styles.radioRow}>
          <input
            type="radio"
            name="ergebnis"
            checked={n.ergebnis == null}
            onChange={() => setField("ergebnis", null)}
          />
          noch nicht festgelegt.
        </label>
        {(counts.wesentlich > 0 || counts.unwesentlich > 0) && (
          <div className={styles.hint}>
            {counts.wesentlich + counts.unwesentlich} Mangel/Mängel erfasst – davon {counts.wesentlich} wesentlich,{" "}
            {counts.unwesentlich} unwesentlich.
          </div>
        )}
      </div>

      <div className={styles.grid}>
        <label className={styles.field}>
          3.2 Frist zur Mängelbeseitigung
          <DebouncedInput
            uid="maengelbeseitigungFrist"
            type="date"
            initialValue={n.maengelbeseitigungFrist ?? ""}
            onCommit={(v) => setField("maengelbeseitigungFrist", v === "" ? null : v)}
          />
        </label>
      </div>
      <label className={styles.radioRow} style={{ marginTop: 8 }}>
        <input
          type="checkbox"
          checked={n.fristAngemessen}
          onChange={(e) => setField("fristAngemessen", e.target.checked)}
        />
        Die Frist wird als angemessen erachtet.
      </label>
      <p className={styles.staticNote}>Die Mängelbeseitigung ist dem AG und der OÜ schriftlich anzuzeigen.</p>

      <div className={styles.radioGroup} style={{ marginTop: 16 }}>
        <div style={{ fontSize: "0.85rem", color: "#555", marginBottom: 6 }}>3.3 &nbsp;Die Leistung wurde</div>
        {TERMINTREUE_OPTIONS.map((opt) => (
          <label key={opt.value} className={styles.radioRow}>
            <input
              type="radio"
              name="termintreue"
              checked={(n.termintreue ?? "offen") === opt.value}
              onChange={() => setField("termintreue", opt.value === "offen" ? null : opt.value)}
            />
            {opt.label}
          </label>
        ))}
      </div>

      <p className={styles.staticNote}>
        3.4 &nbsp;Alle Rechte des AG auf Gewährleistung und Schadenersatz bleiben unberührt. (fester Text, erscheint
        automatisch im PDF)
      </p>
    </div>
  );
}
