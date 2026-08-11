import type { Content } from "pdfmake";
import type { AgendaDocument } from "../types/agenda";
import { compileMaengel } from "../state/selectors";

/**
 * Wird an der `<!-- maengelliste:auto -->`-Stelle in Anlage 3 (Checklisten-Protokoll) eingefügt.
 * Die ausführliche Mängeltabelle steht bereits in Anlage 1 (im Originalformat der Niederschrift) –
 * hier nur ein Verweis, um die Mängel nicht doppelt abzudrucken.
 */
export function buildMaengelSection(doc: AgendaDocument): Content[] {
  const maengel = compileMaengel(doc);

  if (maengel.length === 0) {
    return [{ text: "Es wurden keine Mängel festgestellt.", margin: [0, 2, 0, 10] }];
  }

  const bereich = maengel.length === 1 ? "1" : `1–${maengel.length}`;
  return [
    {
      text: `Die festgestellten Mängel sind in Anlage 1 (Nr. ${bereich}) aufgeführt.`,
      margin: [0, 2, 0, 10],
    },
  ];
}
