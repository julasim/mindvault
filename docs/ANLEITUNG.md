# mindvault — Anleitung

Diese Anleitung ist für dich als Nutzer gedacht, egal ob du programmierst
oder nicht. Du brauchst keine Vorkenntnisse.

## Was ist mindvault?

Ein "Gedächtnis" für die Arbeit mit einem KI-Programm (Claude, ChatGPT,
Gemini, Cursor, ...) — als ganz normaler Ordner mit Textdateien auf deinem
Computer. Ohne so ein Gedächtnis vergisst die KI am Ende jedes Gesprächs
alles wieder: neue Sitzung, wieder von null. Mit mindvault liest die KI am
Anfang eines Gesprächs diesen Ordner und weiß sofort, woran du arbeitest,
was entschieden wurde und was noch offen ist.

Dazu gehört ein zweites Werkzeug, der **Graph-Viewer**: ein Bild deines
Gedächtnisses, das zeigt, wie alle Themen miteinander verbunden sind — wie
eine Mindmap, die sich von selbst zeichnet.

## Die zwei Teile

1. **Dein Vault** — der Ordner mit deinen eigenen Textdateien. Das ist
   deine Daten, die bleiben für immer auf deinem Rechner (oder wo auch
   immer du den Ordner ablegst).
2. **Der Graph-Viewer** — zwei Dateien (`graph-viewer.html` und
   `graph-viewer.js`), die diesen Ordner lesen und als Bild darstellen.
   Läuft direkt im Browser, braucht kein Internet, keine Installation.

## Einrichtung (einmalig)

1. Lade das Projekt herunter (als ZIP von GitHub, Button „Code" → „Download
   ZIP") und entpacke es irgendwo auf deinem Rechner.
2. Kopiere den Ordner `vault-template` an eine Stelle deiner Wahl und
   benenne ihn um, z.B. in `Mein Gedächtnis`. Das ist jetzt dein Vault.
3. Öffne `viewer/graph-viewer.html` mit einem Doppelklick — er öffnet sich
   in deinem Browser. Klicke dort auf „Vault-Ordner öffnen" und wähle
   `demo-vault`, um zu sehen, wie ein befüllter Vault aussieht.
4. Wenn du bereit bist, wähle stattdessen deinen eigenen Ordner
   (`Mein Gedächtnis`).

## Die KI an dein Gedächtnis anschließen

Das hängt davon ab, welches KI-Programm du nutzt — die genauen Schritte für
Claude Code, ChatGPT, Gemini, Cursor und andere stehen im
[README](../README.md) unter „Einrichtung je Plattform". Grundprinzip
überall: Die Datei `CLAUDE.md` in deinem Vault-Ordner sagt der KI, wie sie
sich verhalten soll. Die Datei `MEMORY.md` ist der Überblick, den die KI am
Anfang eines Gesprächs lesen sollte.

## Wie arbeitest du damit, im Alltag?

Du musst selbst nichts pflegen — das macht die KI für dich, während ihr
zusammenarbeitet:

- Du sagst z.B. "merk dir, dass wir uns für Variante B entschieden haben",
  und die KI trägt das in `entscheidungen.md` ein.
- Startest du ein neues Projekt, legt die KI eine neue Datei in
  `projekte/` an und verweist in `MEMORY.md` darauf.
- Am Ende einer Arbeitssitzung trägt die KI eine Zeile in `log/INDEX.md`
  ein, wann was passiert ist.

Du kannst die Dateien aber jederzeit auch selbst mit einem normalen
Texteditor öffnen und von Hand ändern — es ist einfacher Text, keine
Datenbank, kein Geheimnis.

## Drei Dinge, die du kennen solltest

- **`#tag`** — ein Stichwort irgendwo im Text, z.B. `#wichtig`. Dient dazu,
  Themen später wiederzufinden und im Graph-Viewer zu filtern.
- **`Fällig: 2026-11-01`** — eine Frist bei einem offenen Punkt. Die KI
  sollte dich beim nächsten Gespräch von selbst daran erinnern, wenn der
  Termin näher rückt oder verstrichen ist.
- **`[[andere-datei]]`** — ein Verweis auf eine andere Datei in deinem
  Vault. Diese Verweise sind es, die der Graph-Viewer als Linien zwischen
  den Punkten zeichnet.

## Den Graph-Viewer benutzen

Oben in der Leiste wählst du zwischen vier Ansichten:

- **Obsidian-2D** — die klassische Netz-Ansicht, Punkte ziehen sich an
  verbundenen Themen zusammen.
- **Baum** — eine auf- und zuklappbare Liste, wie ein Datei-Explorer.
- **3D-Kugel** — alle Themen auf einer Kugel verteilt, mit der Maus frei
  drehbar.
- **Matrix** — eine Tabellen-Ansicht, wer mit wem verbunden ist.

Daneben gibt es eine Suche, einen Tag-Filter, eine abspielbare Zeitleiste
(wie sich dein Gedächtnis über die Zeit aufgebaut hat) und einen Button, um
die aktuelle Ansicht als Bild zu speichern. Oben links kannst du zwischen
drei Farbdesigns wählen — die Wahl merkt sich dein Browser.

## Häufige Fragen

**Sehe ich fremde Daten, wenn ich den Viewer öffne?** Nein. Der Viewer
schickt nichts ins Internet — alles passiert nur in deinem Browser, auf
deinem Rechner.

**Kann ich den Vault auf mehrere Geräte/Cloud-Speicher legen?** Ja, es ist
nur ein normaler Ordner — OneDrive, Dropbox, ein USB-Stick, alles funktioniert.

**Was, wenn ich etwas kaputt mache?** Die Textdateien sind leicht zu
reparieren oder zurückzusetzen — am einfachsten, indem du den Ordner
regelmäßig sicherst (z.B. über die Cloud-Synchronisierung, die du ohnehin
schon nutzt).
