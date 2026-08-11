import { memo } from "react";
import type { SubSection as SubSectionType } from "../types/agenda";
import ChecklistItemRow from "./ChecklistItemRow";
import styles from "./checklist.module.css";

interface Props {
  section: SubSectionType;
}

function SubSection({ section }: Props) {
  return (
    <div className={styles.subSection}>
      <div className={styles.subSectionTitle}>
        {section.nummer != null ? `${section.nummer} ${section.titel}` : section.titel}
      </div>
      {section.preamble.length > 0 && (
        <div className={styles.preamble}>{section.preamble.join(" ")}</div>
      )}
      {section.items.map((item) => (
        <ChecklistItemRow key={item.uid} item={item} level={0} />
      ))}
    </div>
  );
}

export default memo(SubSection);
