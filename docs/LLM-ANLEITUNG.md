# mindvault — Pflegeanleitung für KI-Assistenten

Diese Datei ist die ausführliche Referenz für ein LLM, das in einem
mindvault-Vault arbeitet. Die kurze Version, die mit jedem Vault
mitgeliefert wird, liegt in `vault-template/CLAUDE.md` — dorthin verweist
die KI selbst bei der Arbeit. Dieses Dokument erklärt dieselben Regeln
ausführlicher, inklusive Begründung und Randfällen, für alle, die das
System implementieren, anpassen oder als Skill nachbauen wollen.

Gilt plattformunabhängig: Claude Code, ChatGPT (mit Dateizugriff/Projekte),
Claude.ai-Projekte, Gemini, Cursor — jedes Tool, das Dateien lesen und
schreiben kann.

## Rolle der KI

Die KI ist **Pfleger, nicht Autor aus eigenem Antrieb.** Der Vault gehört
dem Menschen. Die KI trägt ein, was im Gespräch tatsächlich entschieden
oder verändert wurde — sie erfindet nichts, rundet nichts auf, füllt keine
Lücken mit Vermutungen. Bei Unklarheit nachfragen statt raten.

## Wann schreiben, wann nicht

Schreiben nur bei einem der folgenden Auslöser:

1. **Expliziter Wunsch** — "merk dir das", "notier das", "halt das fest".
2. **Klare Entscheidung im Gespräch** — der Mensch trifft sichtbar eine
   Wahl zwischen Optionen ("dann nehmen wir B").
3. **Klare Standänderung** — ein Projekt wechselt den Status (begonnen,
   fertig, blockiert), eine Aufgabe ist erledigt.
4. **Sitzungsende** — ein Eintrag in `log/INDEX.md`, auch ohne expliziten
   Wunsch, wenn in der Sitzung etwas Nennenswertes passiert ist.

**Nicht schreiben** bei: Zwischenüberlegungen, verworfenen Optionen, reinen
Rückfragen, vorläufigen Zahlen/Entwürfen, die noch nicht bestätigt sind.

## Die vier Dateitypen im Detail

### `MEMORY.md` (Index)

Eine Zeile pro Projekt/Thema, Markdown-Link auf die Detaildatei, mit einem
kurzen "Haken" (worum es geht, aktueller Stand in Kurzform). Dient dem
schnellen Überblick beim Laden — nicht der Detailspeicherung. Bei einem
neuen Projekt: eine Zeile ergänzen, nicht den ganzen Eintrag umschreiben.

```markdown
- [Website-Relaunch](projekte/website-relaunch.md) — Phase 2 läuft,
  Fällig: 2026-11-01 (Texte von Kunde ausstehend)
```

### `projekte/<name>.md`

Eine Datei pro Projekt/Thema. Enthält: aktuellen Stand, offene Punkte
(mit `Fällig:` wo zutreffend), relevante Entscheidungen oder Verweis
darauf, letzte Aktivität mit Datum. Dateiname kebab-case, ohne
Sonderzeichen/Leerzeichen.

Bei einer Aktualisierung: **ergänzen, nicht wiederholen.** Wenn sich der
Stand ändert, den alten Stand nicht einfach stehen lassen und einen neuen
danebenschreiben — den Abschnitt "Stand" ersetzen, Historisches wandert
ins Änderungslog der Datei (falls vorhanden) oder bleibt implizit in
`log/INDEX.md`.

### `entscheidungen.md` (Entscheidungs-Log)

Neuester Eintrag **oben**. Jeder Eintrag: Datum, die Entscheidung in einem
Satz, eine kurze Begründung (das *Warum*, nicht nur das Was — das ist der
Teil, der später wirklich gebraucht wird, wenn jemand fragt "warum haben
wir das so gemacht?").

```markdown
## 2026-10-20 — Hosting-Wechsel auf Variante B
Variante A war günstiger, aber ohne Backup-Automatik. Entscheidung: B,
weil der Mehrpreis gegenüber einem manuellen Backup-Prozess vertretbar ist.
```

### `log/INDEX.md` (Sitzungs-Log)

Eine Zeile pro Arbeitssitzung, neuester Eintrag oben, Datum + Kurzfassung
was passiert ist. Dient zugleich als Datenquelle für die Zeitleiste im
Graph-Viewer — deshalb **immer ein echtes, parsbares Datum** am
Zeilenanfang verwenden (`YYYY-MM-DD`), sonst taucht der Eintrag in der
Zeitleiste nicht auf.

## Konventionen (verbindlich für Parser-Kompatibilität)

Diese drei Regeln sind nicht nur Stilfragen — der Graph-Viewer parst exakt
nach diesem Muster. Abweichungen werden vom Viewer nicht erkannt.

- **Tags:** `#tag` — ein Wort direkt nach `#`, keine Leerzeichen, keine
  Sonderzeichen außer `-`/`_`. Direkt im Fließtext, kein separates
  Tag-Register pflegen.
- **Fälligkeiten:** exakt `Fällig: YYYY-MM-DD` (das Wort "Fällig", Doppel-
  punkt, Leerzeichen, ISO-Datum). Andere Formate (`fällig am...`,
  `Deadline:`) werden nicht erkannt.
- **Verknüpfungen:** `[[dateiname]]` ohne `.md`-Endung. Unterstützt werden
  auch `[[dateiname|Anzeigetext]]` (Alias) und `[[dateiname#Überschrift]]`
  (Sprungziel). Groß-/Kleinschreibung und Umlaute werden beim Auflösen
  normalisiert — `[[Website-Relaunch]]` und `[[website-relaunch]]` zeigen
  auf dieselbe Datei. Ein Link auf einen nicht existierenden Dateinamen
  bleibt unaufgelöst (keine automatische Dateierstellung durch den
  Viewer) — die KI sollte beim Verlinken auf eine Datei diese bei Bedarf
  gleich mit anlegen.
- **"Verwandte Einträge":** jede Datei bekommt am Ende optional einen
  solchen Abschnitt für eingehende Links — von der KI gepflegt, wenn eine
  andere Datei neu auf sie verweist. Das ist redaktionell, nicht vom
  Viewer erzwungen (der Viewer berechnet eingehende Links ohnehin selbst
  aus allen `[[...]]`-Vorkommen im gesamten Vault).

## Umgang mit Fälligkeiten

Beim Laden von `MEMORY.md`/beim Sitzungsstart: überfällige oder in Kürze
anstehende `Fällig:`-Einträge von selbst nennen, ohne dass danach gefragt
wird. Das System selbst ist passiv (kein Benachrichtigungsdienst) — die
aktive Erinnerung ist Aufgabe der KI beim nächsten Gespräch, nicht des
Vaults.

## Neues Projekt / neue Entscheidung / Sitzungsende — Checkliste

- **Neues Projekt:** Datei in `projekte/` anlegen (kebab-case) + eine Zeile
  in `MEMORY.md` ergänzen.
- **Neue Entscheidung:** Eintrag oben in `entscheidungen.md`, mit
  Begründung. Falls projektbezogen, zusätzlich kurzer Verweis in der
  betroffenen `projekte/<name>.md` (`[[entscheidungen#...]]` oder
  Kurzfassung).
- **Sitzungsende:** Zeile oben in `log/INDEX.md`, mit Datum.

## Was die KI explizit nicht tun soll

- Keine Platzhalter-/Dummy-Einträge erzeugen, "damit die Struktur
  vollständig aussieht".
- Keine vergangenen Einträge umschreiben oder löschen, um sie "aufzuräumen"
  — Historisches bleibt stehen, auch wenn es überholt ist (das ist der
  Zweck eines Logs).
- Keine Datei umbenennen, ohne vorher alle `[[Links]]` darauf anzupassen
  (sonst werden Links im Viewer unaufgelöst).
- Keinen `.obsidian`-Konfigurationsordner anlegen — bewusst nicht Teil
  des Systems, damit es mit einem bestehenden Obsidian-Setup des Nutzers
  nicht kollidiert.

## Für eigene Implementierungen/Skills

Wer dieses Pflegeverhalten als eigenen Skill, Hook oder Systemprompt für
ein anderes Tool nachbauen will: Die drei Konventionen (Tags,
Fälligkeiten, Links) sind der stabile Vertrag zwischen Vault-Inhalt und
Graph-Viewer — Parser-Details dazu stehen in `src/parser.js` im
Repository (Regex-Muster, Link-Auflösung, Groß-/Kleinschreibung,
Alias/Überschrift-Syntax). Die Pflegeregeln oben (wann schreiben, wie
strukturieren) sind unabhängig vom Viewer und können 1:1 in ein
System-Prompt, eine `CLAUDE.md`/`.cursorrules`/Custom-Instructions-Feld
übernommen werden.
