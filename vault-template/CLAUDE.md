# Pflegeanleitung für dieses Gedächtnis

Dieser Ordner ist ein dateibasiertes Gedächtnis für die Arbeit mit einem
LLM über mehrere Sitzungen hinweg. Es funktioniert mit jedem LLM-Programm,
das Dateien lesen/schreiben kann (Claude Code, ChatGPT mit Dateizugriff,
Gemini, Cursor, Claude.ai-Projekte mit Projektwissen).

## Struktur

- `MEMORY.md` — Index, eine Zeile pro Projekt/Thema.
- `projekte/<name>.md` — eine Datei pro Projekt: Stand, offene Punkte,
  letzte Aktivität.
- `entscheidungen.md` — Entscheidungs-Log, neuester Eintrag oben, mit
  Datum und kurzer Begründung.
- `log/INDEX.md` — eine Zeile pro Arbeitssitzung (Datum, was passiert ist).

## Konventionen

- **Tags:** `#tag` direkt im Fließtext, z.B. `#patio #security`.
- **Fälligkeiten:** `Fällig: YYYY-MM-DD` bei offenen Punkten. Beim Laden
  dieser Datei überfällige/anstehende Fälligkeiten von selbst nennen.
- **Verknüpfungen:** `[[dateiname]]` (ohne `.md`), um auf eine andere
  Datei im Vault zu verweisen. Jede Datei bekommt am Ende einen Abschnitt
  "Verwandte Einträge" für eingehende Links.

## Pflegeregeln

- Schreiben nur bei explizitem Wunsch ("merk dir", "notier das") oder
  wenn im Gespräch klar eine Entscheidung fällt oder sich ein Projektstand
  ändert.
- Kurz und konkret, mit Datum — keine Wiederholung von bereits
  Dokumentiertem, stattdessen ergänzen.
- Neues Projekt → Datei in `projekte/` + Zeile in `MEMORY.md`. Neue
  Entscheidung → oben in `entscheidungen.md`. Sitzungsende → Zeile oben
  in `log/INDEX.md`.
- Nichts erfinden, bei Unklarheit nachfragen.

## Graph-Ansicht

Öffne `graph-viewer.html` per Doppelklick, um die Verknüpfungen zwischen
allen Dateien visuell zu sehen — läuft offline, ohne LLM. Der Viewer
besteht aus zwei Dateien (`graph-viewer.html` + `graph-viewer.js`), die
immer zusammen im selben Ordner liegen müssen; lege beide dort ab, wo es
für dich am praktischsten ist, z.B. neben deinem Vault-Ordner.
