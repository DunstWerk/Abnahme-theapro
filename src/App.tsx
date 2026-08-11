import { useEffect } from "react";
import { useAgendaStore } from "./state/agendaStore";
import { registerFlushOnUnload } from "./state/persistence";
import Toolbar from "./components/Toolbar";
import TopNav from "./components/TopNav";
import HeaderForm from "./components/HeaderForm";
import TeilnehmerTable from "./components/TeilnehmerTable";
import HinweisBlock from "./components/HinweisBlock";
import MaengelPanel from "./components/MaengelPanel";
import ImportWarnings from "./components/ImportWarnings";
import TopSection from "./components/TopSection";
import styles from "./components/layout.module.css";

export default function App() {
  const doc = useAgendaStore((s) => s.doc);
  const dirtySinceExport = useAgendaStore((s) => s.dirtySinceExport);
  const setHinweis = useAgendaStore((s) => s.setHinweis);
  const setSchlussHinweis = useAgendaStore((s) => s.setSchlussHinweis);

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

  return (
    <div className={styles.app}>
      <Toolbar />
      <div className={styles.body}>
        <TopNav />
        <main className={styles.main}>
          <ImportWarnings />
          <HeaderForm />
          <TeilnehmerTable />
          <HinweisBlock label="Hinweis" value={doc.hinweis} onChange={setHinweis} />
          <MaengelPanel />
          {doc.tops.map((top) => (
            <TopSection key={top.uid} top={top} />
          ))}
          <HinweisBlock label="Schlusshinweis" value={doc.schlussHinweis} onChange={setSchlussHinweis} />
        </main>
      </div>
    </div>
  );
}
