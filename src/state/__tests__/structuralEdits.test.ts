import { beforeEach, describe, expect, it } from "vitest";
import { useAgendaStore } from "../agendaStore";
import { createEmptyAgenda, createEmptyItem, type AgendaDocument, type Top } from "../../types/agenda";
import { parseAgenda } from "../../markdown/parseAgenda";
import { serializeAgenda } from "../../markdown/serializeAgenda";

function buildDoc(): AgendaDocument {
  const doc = createEmptyAgenda();
  doc.titel = "Test-Agenda";
  const top1: Top = {
    uid: "top1",
    rawHeading: "TOP 1 – Erste",
    nummer: "1",
    titel: "Erste",
    preamble: [],
    items: [createEmptyItem("Punkt A")],
    sections: [],
    maengelAnchor: false,
  };
  const top2: Top = {
    uid: "top2",
    rawHeading: "TOP 2 – Zweite",
    nummer: "2",
    titel: "Zweite",
    preamble: [],
    items: [],
    sections: [],
    maengelAnchor: false,
  };
  doc.tops = [top1, top2];
  return doc;
}

beforeEach(() => {
  useAgendaStore.setState({
    doc: buildDoc(),
    ui: { collapsedTops: new Set(), filter: "alle", editMode: false, focusUid: null },
    prefs: { skipDeleteConfirm: false },
  });
});

describe("Struktur-Bearbeitung (agendaStore)", () => {
  it("addTop -> addSection -> addItem: Export/Re-Import ergibt dieselbe Struktur", () => {
    useAgendaStore.getState().addTop();
    const topUid = useAgendaStore.getState().doc.tops[2].uid;
    useAgendaStore.getState().addSection(topUid);
    const sectionUid = useAgendaStore.getState().doc.tops[2].sections[0].uid;
    useAgendaStore.getState().addItem(topUid, sectionUid);

    const md = serializeAgenda(useAgendaStore.getState().doc);
    const reimported = parseAgenda(md);

    expect(reimported.tops).toHaveLength(3);
    expect(reimported.tops[2].nummer).toBe("3");
    expect(reimported.tops[2].titel).toBe("Neues TOP");
    expect(reimported.tops[2].sections).toHaveLength(1);
    expect(reimported.tops[2].sections[0].titel).toBe("Neuer Abschnitt");
    expect(reimported.tops[2].sections[0].items).toHaveLength(1);
    expect(reimported.tops[2].sections[0].items[0].text).toBe("Neuer Punkt");
    expect(reimported.warnings.filter((w) => w.severity === "warn")).toEqual([]);
  });

  it("moveTop ist an beiden Array-Grenzen ein No-op", () => {
    const topsBefore = useAgendaStore.getState().doc.tops;
    useAgendaStore.getState().moveTop("top1", -1);
    expect(useAgendaStore.getState().doc.tops).toBe(topsBefore);
    useAgendaStore.getState().moveTop("top2", 1);
    expect(useAgendaStore.getState().doc.tops).toBe(topsBefore);
  });

  it("moveItem vertauscht innerhalb desselben Containers", () => {
    useAgendaStore.getState().addItem("top1", null);
    const itemsBefore = useAgendaStore.getState().doc.tops[0].items;
    expect(itemsBefore.map((i) => i.text)).toEqual(["Punkt A", "Neuer Punkt"]);
    const secondUid = itemsBefore[1].uid;
    useAgendaStore.getState().moveItem("top1", null, secondUid, -1);
    expect(useAgendaStore.getState().doc.tops[0].items.map((i) => i.text)).toEqual(["Neuer Punkt", "Punkt A"]);
  });

  it("removeItem kann keinen verschachtelten Kind-Punkt löschen (Umfangsgrenze)", () => {
    const parentItem = createEmptyItem("Elternteil");
    const childItem = createEmptyItem("Kind");
    parentItem.children.push(childItem);
    const doc = buildDoc();
    doc.tops[0].items = [parentItem];
    useAgendaStore.setState({ doc });

    useAgendaStore.getState().removeItem("top1", null, childItem.uid);
    expect(useAgendaStore.getState().doc.tops[0].items).toHaveLength(1);
    expect(useAgendaStore.getState().doc.tops[0].items[0].children).toHaveLength(1);
  });

  it("updateTop mit leerem Titel fällt auf den Default-Titel zurück", () => {
    useAgendaStore.getState().updateTop("top1", "   ");
    const top = useAgendaStore.getState().doc.tops.find((t) => t.uid === "top1")!;
    expect(top.titel).toBe("Neues TOP");
  });

  it("updateTop lässt die (automatische) Nummer unangetastet", () => {
    useAgendaStore.getState().updateTop("top1", "Neuer Titel");
    const top = useAgendaStore.getState().doc.tops.find((t) => t.uid === "top1")!;
    expect(top.nummer).toBe("1");
    expect(top.rawHeading).toBe("TOP 1 – Neuer Titel");
  });

  it("addTop mit beforeTopUid fügt an der richtigen Position ein und nummeriert alles neu (inkl. Abschnitts-Präfix)", () => {
    useAgendaStore.getState().addSection("top2");
    expect(useAgendaStore.getState().doc.tops[1].sections[0].nummer).toBe("2.1");

    useAgendaStore.getState().addTop("top2");
    const tops = useAgendaStore.getState().doc.tops;
    expect(tops.map((t) => t.uid)).toEqual(["top1", tops[1].uid, "top2"]);
    expect(tops.map((t) => t.nummer)).toEqual(["1", "2", "3"]);
    expect(tops[2].rawHeading).toBe("TOP 3 – Zweite");
    expect(tops[2].sections[0].nummer).toBe("3.1");
  });

  it("removeTop nummeriert die verbleibenden TOPs neu", () => {
    useAgendaStore.getState().addTop();
    expect(useAgendaStore.getState().doc.tops.map((t) => t.nummer)).toEqual(["1", "2", "3"]);
    useAgendaStore.getState().removeTop("top1");
    const remaining = useAgendaStore.getState().doc.tops;
    expect(remaining.map((t) => t.uid)[0]).toBe("top2");
    expect(remaining.map((t) => t.nummer)).toEqual(["1", "2"]);
  });

  it("reorderTop verschiebt an eine beliebige Position und nummeriert neu", () => {
    useAgendaStore.getState().addTop();
    const top3Uid = useAgendaStore.getState().doc.tops[2].uid;
    useAgendaStore.getState().reorderTop(top3Uid, 0);
    const tops = useAgendaStore.getState().doc.tops;
    expect(tops.map((t) => t.uid)).toEqual([top3Uid, "top1", "top2"]);
    expect(tops.map((t) => t.nummer)).toEqual(["1", "2", "3"]);
  });

  it("reorderSection verschiebt Abschnitte innerhalb eines TOP, ohne sie neu zu nummerieren", () => {
    useAgendaStore.getState().addSection("top1");
    useAgendaStore.getState().addSection("top1");
    const [secA, secB] = useAgendaStore.getState().doc.tops[0].sections;
    useAgendaStore.getState().reorderSection("top1", secB.uid, 0);
    const after = useAgendaStore.getState().doc.tops[0].sections;
    expect(after.map((s) => s.uid)).toEqual([secB.uid, secA.uid]);
    expect(after.map((s) => s.nummer)).toEqual(["1.2", "1.1"]);
  });

  it("reorderItem verschiebt Punkte an eine beliebige Position", () => {
    useAgendaStore.getState().addItem("top1", null);
    useAgendaStore.getState().addItem("top1", null);
    const items = useAgendaStore.getState().doc.tops[0].items;
    expect(items.map((i) => i.text)).toEqual(["Punkt A", "Neuer Punkt", "Neuer Punkt"]);
    const lastUid = items[2].uid;
    useAgendaStore.getState().reorderItem("top1", null, lastUid, 0);
    expect(useAgendaStore.getState().doc.tops[0].items.map((i) => i.uid)[0]).toBe(lastUid);
  });

  it("strukturelle Teilung bleibt erhalten: unbeteiligter TOP behält Objektreferenz", () => {
    const top1Before = useAgendaStore.getState().doc.tops[0];
    useAgendaStore.getState().addItem("top2", null);
    const top1After = useAgendaStore.getState().doc.tops[0];
    expect(top1After).toBe(top1Before);
  });

  it("TOP-Löschung entfernt auch enthaltene Abschnitte", () => {
    useAgendaStore.getState().addSection("top1");
    expect(useAgendaStore.getState().doc.tops[0].sections).toHaveLength(1);
    useAgendaStore.getState().removeTop("top1");
    expect(useAgendaStore.getState().doc.tops.map((t) => t.uid)).toEqual(["top2"]);
  });

  it("setSkipDeleteConfirm setzt die Präferenz im Store", () => {
    expect(useAgendaStore.getState().prefs.skipDeleteConfirm).toBe(false);
    useAgendaStore.getState().setSkipDeleteConfirm(true);
    expect(useAgendaStore.getState().prefs.skipDeleteConfirm).toBe(true);
  });

  it("setEditMode(true) erzwingt Filter 'alle'", () => {
    useAgendaStore.getState().setFilter("mangel");
    expect(useAgendaStore.getState().ui.filter).toBe("mangel");
    useAgendaStore.getState().setEditMode(true);
    expect(useAgendaStore.getState().ui.editMode).toBe(true);
    expect(useAgendaStore.getState().ui.filter).toBe("alle");
  });
});
