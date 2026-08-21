import { describe, expect, it } from "vitest";
import { parseAgenda } from "../parseAgenda";
import { serializeAgenda } from "../serializeAgenda";
import { createEmptyAgenda, createEmptyItem, type AgendaDocument, type Top } from "../../types/agenda";

const FIXED_NOW = new Date("2026-09-03T11:42:00.000Z");

function buildSampleDoc(): AgendaDocument {
  const doc = createEmptyAgenda();
  doc.titel = "VOB-Abnahme – Medientechnik, Deutsches Theater Göttingen";
  doc.header = {
    projekt: "Medientechnik Deutsches Theater Göttingen",
    gewerk: "Medientechnik",
    auftragsnummer: "25-776",
    auftraggeber: "Stadt Göttingen",
    auftraggeberAdresse: "Neues Rathaus Hiroschimaplatz, 37083 Göttingen",
    auftragnehmer: "Muster Medientechnik GmbH",
    fachplanung: "theapro GmbH",
    bearbeiter: "Ralf Preller",
    datum: "2026-09-03",
    uhrzeit: "09:00",
    ort: "Deutsches Theater Göttingen, Bühnenhaus",
    weitere: {},
  };
  doc.teilnehmer = [
    { uid: "t1", name: "M. Beispiel", firmaFunktion: "Stadt Göttingen", rolle: "AG, abnahmeberechtigt" },
    { uid: "t2", name: "K. Muster", firmaFunktion: "Muster Medientechnik GmbH", rolle: "AN, Projektleitung" },
  ];
  doc.hinweis = "Diese Agenda dient der strukturierten Durchführung der Abnahme nach VOB/B § 12.";

  const top1: Top = {
    uid: "top1",
    rawHeading: "TOP 1 – Begrüßung, Formalien",
    nummer: "1",
    titel: "Begrüßung, Formalien",
    preamble: [],
    items: [createEmptyItem("Feststellung der Anwesenheit und Abnahmeberechtigung")],
    sections: [],
    maengelAnchor: false,
  };
  top1.items[0].status = "iO";

  const mangelItem = createEmptyItem("Funktionsprüfung Ruftasten");
  mangelItem.status = "mangel";
  mangelItem.schweregrad = "wesentlich";
  mangelItem.frist = "2026-09-30";
  mangelItem.kommentar = "Taster 3 und 7 ohne Funktion,\nRückmelde-LED bleibt dunkel.";
  mangelItem.extra = { Notiz: "Foto vorhanden" };

  const entfaelltItem = createEmptyItem("Optionale Erweiterung Zweitpult");
  entfaelltItem.status = "entfaellt";
  entfaelltItem.kommentar = "Nicht Bestandteil des Auftrags.";

  const childItem = createEmptyItem("Unterpunkt zur Kontrolle");
  childItem.status = "iO";
  mangelItem.children.push(childItem);

  const top2: Top = {
    uid: "top2",
    rawHeading: "TOP 2 – Funktionsprüfung der Systeme",
    nummer: "2",
    titel: "Funktionsprüfung der Systeme",
    preamble: [],
    items: [],
    sections: [
      {
        uid: "sec1",
        rawHeading: "2.2 Inspizientenanlage Pult",
        nummer: "2.2",
        titel: "Inspizientenanlage Pult",
        preamble: [],
        items: [mangelItem, entfaelltItem],
      },
    ],
    maengelAnchor: false,
  };

  const top4: Top = {
    uid: "top4",
    rawHeading: "TOP 4 – Mängelfeststellung und Dokumentation",
    nummer: "4",
    titel: "Mängelfeststellung und Dokumentation",
    preamble: [],
    items: [],
    sections: [],
    maengelAnchor: true,
  };

  doc.tops = [top1, top2, top4];
  doc.schlussHinweis = "Hinweis: Diese Agenda basiert auf dem Beispielprojekt.";

  doc.niederschrift = {
    ergebnis: "mitMaengeln",
    maengelbeseitigungFrist: "2026-09-30",
    fristAngemessen: true,
    termintreue: "termingerecht",
    verjaehrung: [
      { uid: "v1", nr: "1", anlagenteil: "Inspizientenanlage | Pult", beginn: "18.08.2026", ende: "17.08.2030" },
    ],
    verjaehrungWartung: [{ uid: "v2", nr: "1", anlagenteil: "Inspizientenanlage", beginn: "mit Wartungsvertrag", ende: "" }],
    wartungsvertragNr: "1",
    sonstiges: "Erste Zeile.\nZweite Zeile.",
    unterschriften: [
      { uid: "u1", name: "Preller, Ralf", funktion: "Fachplanung" },
      { uid: "u2", name: "Dallmeier, Robby", funktion: "" },
    ],
    weitere: {},
  };
  doc.feststellungen = [
    {
      uid: "f1",
      bezeichnung: "Regieplatz",
      beschreibung: "Restarbeiten Kabelführung,\nzweite Zeile mit | Pipe.",
      zustaendig: "AN",
      frist: "2026-09-15",
    },
  ];

  return doc;
}

describe("serializeAgenda / parseAgenda round-trip", () => {
  it("ist selbstkonsistent: serialize -> parse -> serialize ergibt denselben Text", () => {
    const doc = buildSampleDoc();
    const md1 = serializeAgenda(doc, { now: FIXED_NOW });
    const doc2 = parseAgenda(md1);
    const md2 = serializeAgenda(doc2, { now: FIXED_NOW });
    expect(md2).toBe(md1);
  });

  it("erhält alle Felder über einen vollen Round-Trip (Status, Kommentar, Schweregrad, Frist, Kinder, Extra-Felder)", () => {
    const doc = buildSampleDoc();
    const md = serializeAgenda(doc, { now: FIXED_NOW });
    const parsed = parseAgenda(md);

    expect(parsed.titel).toBe(doc.titel);
    expect(parsed.header.projekt).toBe(doc.header.projekt);
    expect(parsed.teilnehmer).toHaveLength(2);
    expect(parsed.teilnehmer[1].name).toBe("K. Muster");
    expect(parsed.hinweis).toBe(doc.hinweis);
    expect(parsed.schlussHinweis).toBe(doc.schlussHinweis);

    const sec = parsed.tops[1].sections[0];
    expect(sec.nummer).toBe("2.2");
    const mangel = sec.items[0];
    expect(mangel.status).toBe("mangel");
    expect(mangel.schweregrad).toBe("wesentlich");
    expect(mangel.frist).toBe("2026-09-30");
    expect(mangel.kommentar).toBe("Taster 3 und 7 ohne Funktion,\nRückmelde-LED bleibt dunkel.");
    expect(mangel.extra.Notiz).toBe("Foto vorhanden");
    expect(mangel.children).toHaveLength(1);
    expect(mangel.children[0].status).toBe("iO");

    const entfaellt = sec.items[1];
    expect(entfaellt.status).toBe("entfaellt");

    expect(parsed.tops[2].maengelAnchor).toBe(true);

    expect(parsed.header.gewerk).toBe(doc.header.gewerk);
    expect(parsed.header.auftragsnummer).toBe(doc.header.auftragsnummer);
    expect(parsed.header.auftraggeberAdresse).toBe(doc.header.auftraggeberAdresse);
    expect(parsed.header.bearbeiter).toBe(doc.header.bearbeiter);

    expect(parsed.niederschrift.ergebnis).toBe("mitMaengeln");
    expect(parsed.niederschrift.maengelbeseitigungFrist).toBe("2026-09-30");
    expect(parsed.niederschrift.fristAngemessen).toBe(true);
    expect(parsed.niederschrift.termintreue).toBe("termingerecht");
    expect(parsed.niederschrift.verjaehrung).toHaveLength(1);
    expect(parsed.niederschrift.verjaehrung[0].anlagenteil).toBe("Inspizientenanlage | Pult");
    expect(parsed.niederschrift.verjaehrungWartung).toHaveLength(1);
    expect(parsed.niederschrift.wartungsvertragNr).toBe("1");
    expect(parsed.niederschrift.sonstiges).toBe("Erste Zeile.\nZweite Zeile.");
    expect(parsed.niederschrift.unterschriften).toHaveLength(2);
    expect(parsed.niederschrift.unterschriften[1].name).toBe("Dallmeier, Robby");

    expect(parsed.feststellungen).toHaveLength(1);
    expect(parsed.feststellungen[0].bezeichnung).toBe("Regieplatz");
    expect(parsed.feststellungen[0].beschreibung).toBe("Restarbeiten Kabelführung,\nzweite Zeile mit | Pipe.");
    expect(parsed.feststellungen[0].frist).toBe("2026-09-15");
  });

  it("ein unbenutztes, frisch offenes Item wird ohne Metadaten-Zeilen serialisiert", () => {
    const doc = createEmptyAgenda();
    doc.titel = "Test";
    doc.tops = [
      {
        uid: "t",
        rawHeading: "TOP 1 – Test",
        nummer: "1",
        titel: "Test",
        preamble: [],
        items: [createEmptyItem("Ein offener Punkt")],
        sections: [],
        maengelAnchor: false,
      },
    ];
    const md = serializeAgenda(doc, { now: FIXED_NOW });
    expect(md).toContain("- [ ] Ein offener Punkt");
    expect(md).not.toContain("Status: offen");
  });
});

describe("ÖNORM-Rechtsgrundlage (oenorm)", () => {
  it("Default false wird als 'nein' serialisiert und bleibt beim Round-Trip false", () => {
    const doc = buildSampleDoc();
    expect(doc.oenorm).toBe(false);
    const md = serializeAgenda(doc, { now: FIXED_NOW });
    expect(md).toContain("- **Rechtsgrundlage ÖNORM:** nein");
    const parsed = parseAgenda(md);
    expect(parsed.oenorm).toBe(false);
    expect(parsed.warnings.filter((w) => w.severity === "warn")).toEqual([]);
  });

  it("oenorm: true wird als 'ja' serialisiert und bleibt beim Round-Trip true", () => {
    const doc = buildSampleDoc();
    doc.oenorm = true;
    const md = serializeAgenda(doc, { now: FIXED_NOW });
    expect(md).toContain("- **Rechtsgrundlage ÖNORM:** ja");
    const parsed = parseAgenda(md);
    expect(parsed.oenorm).toBe(true);
    expect(parsed.warnings.filter((w) => w.severity === "warn")).toEqual([]);
  });

  it("alte .md-Dateien ohne die Rechtsgrundlage-Zeile werden klaglos als oenorm:false gelesen", () => {
    const raw = "# Titel\n\n## TOP 1 – Test\n\n- [ ] Punkt\n";
    const doc = parseAgenda(raw);
    expect(doc.oenorm).toBe(false);
    expect(doc.warnings.filter((w) => w.severity === "warn")).toEqual([]);
  });
});

describe("parseAgenda Toleranz gegenüber Hand-Edits", () => {
  it("akzeptiert CRLF-Zeilenenden und BOM", () => {
    const raw = "﻿# Titel\r\n\r\n## TOP 1 – Test\r\n\r\n- [x] Punkt\r\n";
    const doc = parseAgenda(raw);
    expect(doc.titel).toBe("Titel");
    expect(doc.tops[0].items[0].status).toBe("iO");
  });

  it("normalisiert deutsches Datumsformat DD.MM.YYYY", () => {
    const raw = [
      "# Titel",
      "",
      "## TOP 1 – Test",
      "",
      "- [!] Mangel",
      "  - Status: Mangel",
      "  - Frist: 30.09.2026",
      "",
    ].join("\n");
    const doc = parseAgenda(raw);
    expect(doc.tops[0].items[0].frist).toBe("2026-09-30");
  });

  it("akzeptiert Status-Aliase wie OK", () => {
    const raw = ["# Titel", "", "## TOP 1 – Test", "", "- [ ] Punkt", "  - Status: OK", ""].join("\n");
    const doc = parseAgenda(raw);
    expect(doc.tops[0].items[0].status).toBe("iO");
  });

  it("ein explizites Status-Feld gewinnt gegenüber widersprüchlichem Checkbox-Zeichen", () => {
    const raw = ["# Titel", "", "## TOP 1 – Test", "", "- [ ] Punkt", "  - Status: Mangel", ""].join("\n");
    const doc = parseAgenda(raw);
    expect(doc.tops[0].items[0].status).toBe("mangel");
  });

  it("unbekannte Metadaten- und Header-Felder bleiben erhalten", () => {
    const raw = [
      "# Titel",
      "",
      "## Rahmendaten",
      "",
      "- **Projekt:** Test",
      "- **Besonderheit:** Denkmalschutz",
      "",
      "## TOP 1 – Test",
      "",
      "- [ ] Punkt",
      "  - Notiz: Wichtig für Nachtrag",
      "",
    ].join("\n");
    const doc = parseAgenda(raw);
    expect(doc.header.weitere["Besonderheit"]).toBe("Denkmalschutz");
    expect(doc.tops[0].items[0].extra.Notiz).toBe("Wichtig für Nachtrag");
  });

  it("funktioniert ohne Front-Matter", () => {
    const raw = "# Titel\n\n## TOP 1 – Test\n\n- [ ] Punkt\n";
    const doc = parseAgenda(raw);
    expect(doc.warnings.filter((w) => w.severity === "warn")).toHaveLength(0);
    expect(doc.tops).toHaveLength(1);
  });

  it("erhält lückenhafte Subsection-Nummerierung unverändert", () => {
    const raw = [
      "# Titel",
      "",
      "## TOP 2 – Rundgang",
      "",
      "### 2.2 Erste Anlage",
      "",
      "- [ ] Punkt A",
      "",
      "### 2.5 Übernächste Anlage",
      "",
      "- [ ] Punkt B",
      "",
    ].join("\n");
    const doc = parseAgenda(raw);
    expect(doc.tops[0].sections.map((s) => s.nummer)).toEqual(["2.2", "2.5"]);
  });

  it("TOP-Überschriften ohne 'TOP n – Titel'-Muster werden als Freitext-Titel übernommen", () => {
    const raw = "# Titel\n\n## Sonderpunkt Ohne Nummer\n\n- [ ] Punkt\n";
    const doc = parseAgenda(raw);
    expect(doc.tops[0].nummer).toBeNull();
    expect(doc.tops[0].titel).toBe("Sonderpunkt Ohne Nummer");
  });
});
