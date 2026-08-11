# VOB-Abnahme Helfer

Kleiner Helfer für die strukturierte VOB-Abnahme (§ 12 VOB/B). Die App
läuft komplett im Browser (kein Server, keine Datenbank) und hilft dabei,
während einer Abnahme die Agenda/Checkliste live durchzugehen, jeden Punkt
mit Status und Kommentar zu versehen, daraus automatisch eine Mängelliste
zu erzeugen und am Ende ein PDF zu exportieren, das als Anlage dem
VOB-Abnahmeprotokoll beigefügt werden kann.

## Funktionen

- Interaktive Checkliste mit Status **offen / i.O. / Mangel / entfällt**,
  Kommentarfeld je Punkt sowie Schweregrad (wesentlich/unwesentlich) und
  Frist bei Mängeln.
- Automatisch aus allen als "Mangel" markierten Punkten kompilierte
  Mängelliste (live in der App sichtbar, im PDF an TOP "Mängelfeststellung"
  eingefügt).
- Agenda-Import/-Export als Markdown-Datei (`.md`) – editierbar in jedem
  Texteditor, siehe [docs/markdown-dialekt.md](docs/markdown-dialekt.md).
  Damit lässt sich die App auch für andere Abnahmen wiederverwenden: eigene
  Agenda schreiben/anpassen und importieren.
- Zusätzlicher CSV-Export (Checkliste und separat die Mängelliste) für die
  Bearbeitung in Tabellenprogrammen.
- PDF-Export in den Firmenfarben (Coral/Ice/Grey/Olive), Schrift Arimo
  (metrisch identisch zu Arial, siehe unten) bei 10pt.
- Autosave im Browser (localStorage) inkl. Sicherungskopie vor
  Import/Reset.

## Entwicklung

```bash
npm install
npm run dev       # Entwicklungsserver
npm run build     # Produktions-Build nach dist/
npm run preview   # Produktions-Build lokal ansehen
npm run test      # Tests (Markdown-Parser/-Serializer)
```

## Hinweis zur PDF-Schrift

Arial ist eine proprietäre Schrift und darf ohne Lizenz nicht in ein PDF
eingebettet werden. Deshalb wird **Arimo** verwendet (SIL Open Font
License, siehe `src/assets/fonts/OFL.txt`) – metrisch identisch zu Arial,
also mit denselben Laufweiten/Zeilenumbrüchen. Bei Bedarf lässt sich in
`src/pdf/pdfFonts.ts` durch eine lizenzierte Arial-Schriftdatei ersetzen.

## Hosting

Die App ist eine rein statische Single-Page-Application. `npm run build`
erzeugt ein `dist/`-Verzeichnis, das sich auf jedem statischen Webhosting
(z. B. GitHub Pages, siehe `.github/workflows/deploy.yml`) oder auch nur
lokal im Browser (`npm run preview`) nutzen lässt.
