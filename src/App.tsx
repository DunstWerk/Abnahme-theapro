import { Fragment, useEffect, useState } from "react";
import { useAgendaStore } from "./state/agendaStore";
import { useDragReorder, dragPropsFor } from "./components/useDragReorder";
import { registerFlushOnUnload } from "./state/persistence";
import { isUnlocked } from "./auth/passwordGate";
import PasswordGate from "./components/PasswordGate";
import Toolbar from "./components/Toolbar";
import TopNav from "./components/TopNav";
import HeaderForm from "./components/HeaderForm";
import TeilnehmerTable from "./components/TeilnehmerTable";
import HinweisBlock from "./components/HinweisBlock";
import MaengelPanel from "./components/MaengelPanel";
import ImportWarnings from "./components/ImportWarnings";
import TopSection from "./components/TopSection";
import AbnahmeErgebnisForm from "./components/AbnahmeErgebnisForm";
import VerjaehrungsfristenTable from "./components/VerjaehrungsfristenTable";
import UnterschriftenTable from "./components/UnterschriftenTable";
import FeststellungenPanel from "./components/FeststellungenPanel";
import DebouncedInput from "./components/DebouncedInput";
import formStyles from "./components/forms.module.css";
import styles from "./components/layout.module.css";
import checklistStyles from "./components/checklist.module.css";

export default function App() {
  const [unlocked, setUnlocked] = useState(() => isUnlocked());
  const doc = useAgendaStore((s) => s.doc);
  const dirtySinceExport = useAgendaStore((s) => s.dirtySinceExport);
  const setHinweis = useAgendaStore((s) => s.setHinweis);
  const setSchlussHinweis = useAgendaStore((s) => s.setSchlussHinweis);
  const setNiederschriftField = useAgendaStore((s) => s.setNiederschriftField);
  const editMode = useAgendaStore((s) => s.ui.editMode);
  const setEditMode = useAgendaStore((s) => s.setEditMode);
  const addTop = useAgendaStore((s) => s.addTop);
  const reorderTop = useAgendaStore((s) => s.reorderTop);
  const topDrag = useDragReorder(doc.tops, reorderTop);

  useEffect(() => registerFlushOnUnload(), []);

  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (!dirtySinceExport) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirtySinceExport]);

  if (!unlocked) {
    return <PasswordGate onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <div className={styles.app}>
      <Toolbar />
      {editMode && (
        <div className={styles.editModeBanner}>
          <span>Bearbeitungsmodus aktiv – die Agenda-Struktur kann geändert werden.</span>
          <button type="button" className={styles.editModeBannerButton} onClick={() => setEditMode(false)}>
            Beenden
          </button>
        </div>
      )}
      <div className={styles.body}>
        <TopNav />
        <main className={styles.main}>
          <ImportWarnings />
          <HeaderForm />
          <TeilnehmerTable />
          <HinweisBlock label="Hinweis" value={doc.hinweis} onChange={setHinweis} />
          <MaengelPanel />
          {doc.tops.map((top, i) => (
            <Fragment key={top.uid}>
              {editMode && (
                <div className={checklistStyles.insertTopRow}>
                  <button
                    type="button"
                    className={checklistStyles.insertTopButton}
                    onClick={() => addTop(top.uid)}
                    aria-label={`Neues TOP vor "${top.titel}" einfügen`}
                  >
                    + TOP einfügen
                  </button>
                </div>
              )}
              <TopSection
                top={top}
                index={i}
                total={doc.tops.length}
                dragProps={editMode ? dragPropsFor(topDrag, top.uid) : undefined}
              />
            </Fragment>
          ))}
          {editMode && (
            <div className={formStyles.panel}>
              <button type="button" className={formStyles.addButton} onClick={() => addTop()}>
                + Neues TOP
              </button>
            </div>
          )}
          <HinweisBlock label="Schlusshinweis" value={doc.schlussHinweis} onChange={setSchlussHinweis} />

          <AbnahmeErgebnisForm />
          <VerjaehrungsfristenTable titel="Verjährungsfristen für Mängelansprüche" liste="verjaehrung" />
          <VerjaehrungsfristenTable titel="Verjährungsfristen bei Wartungsvertrag" liste="verjaehrungWartung">
            <label className={formStyles.field} style={{ maxWidth: 260, marginBottom: 12 }}>
              Für die Nr. (aus obiger Aufstellung)
              <DebouncedInput
                uid="wartungsvertragNr"
                initialValue={doc.niederschrift.wartungsvertragNr}
                onCommit={(v) => setNiederschriftField("wartungsvertragNr", v)}
              />
            </label>
          </VerjaehrungsfristenTable>
          <HinweisBlock
            label="Sonstiges"
            value={doc.niederschrift.sonstiges}
            onChange={(v) => setNiederschriftField("sonstiges", v)}
          />
          <UnterschriftenTable />
          <FeststellungenPanel />
        </main>
      </div>
    </div>
  );
}
