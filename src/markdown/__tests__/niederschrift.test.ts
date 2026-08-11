import { describe, expect, it } from "vitest";
import { parseAgenda } from "../parseAgenda";

describe("Niederschrift-Abschnitte: Kollisionsschutz und Toleranz", () => {
  it("TOP 4 'Mängelfeststellung' wird weiterhin als TOP erkannt, nicht als Feststellungen-Sektion", () => {
    const raw = [
      "# Titel",
      "",
      "## TOP 4 – Mängelfeststellung und Dokumentation",
      "",
      "- [ ] Mängelliste erstellen",
      "- [ ] Einstufung festlegen",
      "",
    ].join("\n");
    const doc = parseAgenda(raw);
    expect(doc.tops).toHaveLength(1);
    expect(doc.tops[0].nummer).toBe("4");
    expect(doc.tops[0].items).toHaveLength(2);
    expect(doc.feststellungen).toHaveLength(0);
  });

  it("fehlende neue Abschnitte ergeben leere Standardwerte ohne Warnungen", () => {
    const raw = "# Titel\n\n## TOP 1 – Test\n\n- [ ] Punkt\n";
    const doc = parseAgenda(raw);
    expect(doc.warnings.filter((w) => w.severity === "warn")).toHaveLength(0);
    expect(doc.niederschrift.ergebnis).toBeNull();
    expect(doc.niederschrift.verjaehrung).toEqual([]);
    expect(doc.niederschrift.unterschriften).toEqual([]);
    expect(doc.feststellungen).toEqual([]);
  });

  it("akzeptiert Ergebnis- und Fertigstellungs-Aliase", () => {
    const raw = [
      "# Titel",
      "",
      "## Abnahmeergebnis",
      "",
      "- **Ergebnis:** ohne Mangel",
      "- **Fertigstellung:** verspätet",
      "- **Frist angemessen:** X",
      "",
    ].join("\n");
    const doc = parseAgenda(raw);
    expect(doc.niederschrift.ergebnis).toBe("ohneMaengel");
    expect(doc.niederschrift.termintreue).toBe("nichtTermingerecht");
    expect(doc.niederschrift.fristAngemessen).toBe(true);
  });

  it("'Auftragsdatum / Auftragsnummer' landet in auftragsnummer, nicht in datum", () => {
    const raw = [
      "# Titel",
      "",
      "## Rahmendaten",
      "",
      "- **Auftragsdatum / Auftragsnummer:** 25-776",
      "- **Datum:** 2026-08-18",
      "",
    ].join("\n");
    const doc = parseAgenda(raw);
    expect(doc.header.auftragsnummer).toBe("25-776");
    expect(doc.header.datum).toBe("2026-08-18");
  });

  it("liest Verjährungsfristen-Tabellen inkl. Wartungsvertrag-Variante", () => {
    const raw = [
      "# Titel",
      "",
      "## Verjährungsfristen",
      "",
      "| Nr. | Anlagenteil | Beginn | Ende |",
      "|---|---|---|---|",
      "| 1 | Inspizientenanlage | 18.08.2026 | 17.08.2030 |",
      "",
      "## Verjährungsfristen bei Wartungsvertrag",
      "",
      "- **Für die Nr.:** 1",
      "",
      "| Nr. | Anlagenteil | Beginn | Ende |",
      "|---|---|---|---|",
      "| 1 | Inspizientenanlage | mit Wartungsvertrag | – |",
      "",
    ].join("\n");
    const doc = parseAgenda(raw);
    expect(doc.niederschrift.verjaehrung).toHaveLength(1);
    expect(doc.niederschrift.verjaehrung[0].anlagenteil).toBe("Inspizientenanlage");
    expect(doc.niederschrift.wartungsvertragNr).toBe("1");
    expect(doc.niederschrift.verjaehrungWartung).toHaveLength(1);
  });

  it("liest Feststellungen mit mehrzeiliger Beschreibung (<br>-kodiert)", () => {
    const raw = [
      "# Titel",
      "",
      "## Feststellungen und Festlegungen",
      "",
      "| Bezeichnung | Beschreibung | Zuständig | Frist |",
      "|---|---|---|---|",
      "| Regieplatz | Zeile 1<br>Zeile 2 | AN | 2026-09-15 |",
      "",
    ].join("\n");
    const doc = parseAgenda(raw);
    expect(doc.feststellungen).toHaveLength(1);
    expect(doc.feststellungen[0].beschreibung).toBe("Zeile 1\nZeile 2");
    expect(doc.feststellungen[0].frist).toBe("2026-09-15");
  });
});
