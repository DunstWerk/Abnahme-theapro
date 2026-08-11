# Markdown-Dialekt der Abnahme-Agenda

Die Agenda wird als `.md`-Datei ex- und importiert. Das Format ist bewusst so
gewählt, dass es sich in jedem normalen Texteditor lesen und bearbeiten lässt
(z. B. um das Tool für eine andere Abnahme anzupassen). Diese Seite
beschreibt die Syntax.

## Aufbau

```markdown
---
format: vob-abnahme-agenda/2
exported: 2026-09-03T11:42:00Z
---

# Titel des Dokuments

## Rahmendaten

- **Projekt:** ...
- **Gewerk / Art der Arbeiten:** ...
- **Auftragsnummer:** ...
- **Auftraggeber (AG):** ...
- **Anschrift (AG):** ...
- **Auftragnehmer (AN):** ...
- **Fachplanung:** ...
- **Bearbeiter:** ...
- **Datum:** 2026-09-03
- **Uhrzeit:** 09:00
- **Ort:** ...

## Teilnehmer

| Name | Firma / Funktion | Rolle beim Termin |
|---|---|---|
| ... | ... | ... |

## Hinweis

Freitext.

## TOP 1 – Begrüßung, Formalien

- [ ] Ein Punkt
- [x] Ein erledigter Punkt

## TOP 5 – Abschluss

- [ ] ...

## Schlusshinweis

Freitext.

## Abnahmeergebnis

- **Ergebnis:** ...
- **Frist zur Mängelbeseitigung:** ...
- **Frist angemessen:** ja
- **Fertigstellung:** ...

## Verjährungsfristen

| Nr. | Anlagenteil | Beginn | Ende |
|---|---|---|---|
| ... | ... | ... | ... |

## Verjährungsfristen bei Wartungsvertrag

- **Für die Nr.:** ...

| Nr. | Anlagenteil | Beginn | Ende |
|---|---|---|---|

## Sonstiges

Freitext (nur wenn ausgefüllt).

## Unterschriften

| Name | Funktion |
|---|---|
| ... | ... |

## Feststellungen und Festlegungen

| Bezeichnung | Beschreibung | Zuständig | Frist |
|---|---|---|---|
| ... | ... | ... | ... |
```

Der `---`-Block am Anfang ist optional und rein informativ (Format-Version,
Export-Zeitpunkt). Fehlt er, wird trotzdem normal eingelesen. Alle
Abschnitte ab "Abnahmeergebnis" sind optional – solange die Niederschrift
noch nicht ausgefüllt ist (typischerweise während der Begehung, wenn nur
die Checkliste bearbeitet wird), müssen sie in der Datei nicht vorkommen;
es gelten dann die leeren Standardwerte.

## Status je Punkt

Das Zeichen in der Checkbox bestimmt den Status:

| Zeichen | Status |
|---|---|
| `[ ]` | offen |
| `[x]` oder `[X]` | i.O. |
| `[!]` | Mangel |
| `[-]` oder `[~]` | entfällt |

Zusätzlich können direkt unter einem Punkt eingerückte Metadaten-Zeilen
stehen (kein Häkchen, nur `- Key: Wert`):

```markdown
- [!] Funktionsprüfung Ruftasten
  - Status: Mangel
  - Schweregrad: wesentlich
  - Frist: 2026-09-30
  - Kommentar: Taster 3 und 7 ohne Funktion,
    Rückmelde-LED bleibt dunkel.
```

- `Status:` überschreibt, falls vorhanden, das Checkbox-Zeichen (praktisch,
  wenn man beim Bearbeiten mal nicht konsistent ist).
- `Schweregrad:` ist `wesentlich` oder `unwesentlich` und wird nur bei
  `Mangel` ausgewertet.
- `Frist:` als `JJJJ-MM-TT` oder `TT.MM.JJJJ`.
- `Kommentar:` kann mehrzeilig sein – einfach die Folgezeilen weiter
  einrücken, ohne führendes `-`.
- Alle anderen `- Key: Wert`-Zeilen (z. B. `- Notiz: ...`) werden als
  frei benanntes Feld übernommen und beim nächsten Export unverändert
  wieder ausgegeben.

Ein frischer, noch nicht bearbeiteter Punkt (Status offen, kein Kommentar)
wird beim Export **ohne** Metadaten-Zeilen geschrieben – nur
`- [ ] Text`. Eine unbenutzte Vorlage bleibt dadurch beim Ex-/Re-Import
byteidentisch.

### Akzeptierte Status-Aliase (nur bei `Status:`)

`i.O.`, `io`, `OK`, `in Ordnung`, `erledigt` → i.O.
`M`, `mangel`, `defekt` → Mangel
`entfällt`, `entfaellt`, `n.a.`, `entf.` → entfällt
leer oder `-` → offen

## Kinder-Punkte (Unterpunkte)

Ein Punkt kann Unterpunkte haben, indem er weiter eingerückt wird:

```markdown
- [ ] Hauptpunkt
  - [ ] Unterpunkt
```

## Abschnitte (`###`) innerhalb eines TOP

```markdown
## TOP 2 – Funktionsprüfung der Systeme

### 2.2 Inspizientenanlage Pult

- [ ] ...

### 2.3 Mitschauanlage

- [ ] ...
```

Die Nummerierung der Abschnitte darf lückenhaft oder unsortiert sein
(z. B. 2.2, 2.3, 2.5, 2.4, 2.6, 2.8) – sie wird unverändert übernommen.

## Automatische Mängelliste

An der Stelle, an der im PDF die automatisch aus allen `Mangel`-Punkten
zusammengestellte Mängelliste erscheinen soll (üblicherweise beim TOP
"Mängelfeststellung"), steht folgende Zeile:

```markdown
<!-- maengelliste:auto -->
```

Fehlt dieser Marker, wird die Mängelliste automatisch vor dem TOP
"Abschluss" eingefügt.

## Niederschrift (Abnahmeprotokoll)

Zusätzlich zur Checkliste erzeugt die App auch die formelle "Niederschrift
- Abnahme nach VOB/B § 12" inkl. Anlagen. Der Briefkopf und die
rechtlichen Angaben (Adresse, Bank, HRB, Geschäftsführung) sind fest im
PDF-Code hinterlegt und **nicht** Teil dieser Markdown-Datei – nur die
folgenden, von Termin zu Termin unterschiedlichen Inhalte werden hier
gespeichert:

- **`## Abnahmeergebnis`** (§3): `Ergebnis` ist `ohne Mängel`,
  `nicht abgenommen` oder `mit Mängeln`; `Frist angemessen` ist `ja`
  oder `nein`; `Fertigstellung` ist `termingerecht` oder
  `nicht termingerecht`. Akzeptierte Aliase u. a.: `ohne Mangel`,
  `mängelfrei` → ohne Mängel; `verweigert` → nicht abgenommen; `mit
  Vorbehalt` → mit Mängeln; `verspätet`/`verzug` → nicht termingerecht.
- **`## Verjährungsfristen`** (§4.1) und **`## Verjährungsfristen bei
  Wartungsvertrag`** (§4.2, mit zusätzlichem Bullet `Für die Nr.:`):
  `Beginn`/`Ende` sind bewusst Freitext (auch "mit Abnahme" o. ä.), kein
  Datumszwang.
- **`## Sonstiges`** (§5): Freitext, wird nur exportiert, wenn ausgefüllt.
- **`## Unterschriften`** (§6): beliebig viele Namen/Funktionen; die
  Zeile "Datum, Bearbeiter" oberhalb wird automatisch aus `Datum` und
  `Bearbeiter` der Rahmendaten gebildet, nicht separat gespeichert.
- **`## Feststellungen und Festlegungen`** (Anlage 2): frei gepflegte
  Liste, unabhängig von der Checkliste – für allgemeine Notizen/
  Entscheidungen, die keine Mängel sind (die Mängelliste für Anlage 1
  wird weiterhin automatisch aus den mit "Mangel" markierten
  Checklisten-Punkten zusammengestellt).

In Tabellenzellen dieser Abschnitte werden `|` als `\|` und
Zeilenumbrüche (z. B. bei einer mehrzeiligen Feststellungs-Beschreibung)
als `<br>` kodiert, damit sie innerhalb einer GFM-Tabellenzeile gültig
bleiben. Die Teilnehmer-Tabelle ist davon nicht betroffen.

## Eigene Agenda für eine andere Abnahme erstellen

Die einfachste Methode: die mitgelieferte Beispiel-Vorlage über
"Vorlage laden" in der App öffnen, per "Agenda exportieren" als `.md`
speichern, in einem Texteditor die Rahmendaten, TOPs und Punkte an das
eigene Projekt anpassen, und die Datei anschließend über "Agenda
importieren" wieder laden.
