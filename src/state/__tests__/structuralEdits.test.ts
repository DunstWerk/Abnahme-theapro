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

  it("updateTop mit leerer Nummer ergibt nummer: null", () => {
    useAgendaStore.getState().updateTop("top1", { nummer: "" });
    const top = useAgendaStore.getState().doc.tops.find((t) => t.uid === "top1")!;
    expect(top.nummer).toBeNull();
    expect(top.rawHeading).toBe(top.titel);
  });

  it("updateTop mit leerem Titel fällt auf den Default-Titel zurück", () => {
    useAgendaStore.getState().updateTop("top1", { titel: "   " });
    const top = useAgendaStore.getState().doc.tops.find((t) => t.uid === "top1")!;
    expect(top.titel).toBe("Neues TOP");
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
