import { memo, useRef } from "react";
import type { ChecklistItem, ItemStatus, Schweregrad } from "../types/agenda";
import { useAgendaStore } from "../state/agendaStore";
import StatusSelector from "./StatusSelector";
import CommentField from "./CommentField";
import MangelDetails from "./MangelDetails";
import styles from "./checklist.module.css";

interface Props {
  item: ChecklistItem;
  level: number;
}

function ChecklistItemRow({ item, level }: Props) {
  const setItemStatus = useAgendaStore((s) => s.setItemStatus);
  const setItemKommentar = useAgendaStore((s) => s.setItemKommentar);
  const setItemSchweregrad = useAgendaStore((s) => s.setItemSchweregrad);
  const setItemFrist = useAgendaStore((s) => s.setItemFrist);
  const containerRef = useRef<HTMLDivElement | null>(null);

  function handleStatusChange(status: ItemStatus) {
    setItemStatus(item.uid, status);
    if (status === "mangel") {
      if (!item.schweregrad) setItemSchweregrad(item.uid, "wesentlich");
      setTimeout(() => {
        containerRef.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus();
      }, 0);
    }
  }

  return (
    <div ref={containerRef} className={level > 0 ? styles.itemChild : undefined}>
      <div className={styles.itemRow}>
        <StatusSelector value={item.status} onChange={handleStatusChange} />
        <div className={styles.itemMain}>
          <div className={`${styles.itemText} ${item.status === "mangel" ? styles.itemTextMangel : ""}`}>
            {item.text}
          </div>
          <CommentField
            uid={item.uid}
            initialValue={item.kommentar}
            onCommit={(text) => setItemKommentar(item.uid, text)}
          />
          {item.status === "mangel" && (
            <MangelDetails
              schweregrad={item.schweregrad}
              frist={item.frist}
              onSchweregradChange={(sg: Schweregrad) => setItemSchweregrad(item.uid, sg)}
              onFristChange={(date) => setItemFrist(item.uid, date)}
            />
          )}
        </div>
      </div>
      {item.children.length > 0 && (
        <div className={styles.childList}>
          {item.children.map((child) => (
            <ChecklistItemRow key={child.uid} item={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(ChecklistItemRow);
