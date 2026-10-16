# mindvault — Dateibasiertes Gedächtnis für jedes LLM

## Schnellstart

1. Kopiere `vault-template/` an einen Ort deiner Wahl, z.B. `mein-gedaechtnis/`.
2. Öffne `viewer/graph-viewer.html` per Doppelklick, um deinen Vault jederzeit visuell zu sehen — läuft offline, ohne Internet, ohne LLM.
3. Schau dir zuerst `demo-vault/` im Viewer an, um zu sehen, wie ein befüllter Vault aussieht.

## Einrichtung je Plattform

**Claude Code:** Lege im Vault-Ordner eine `.claude/settings.json` mit folgendem Inhalt an, damit Claude Code `MEMORY.md` bei jedem Sitzungsstart automatisch lädt:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "cat MEMORY.md 2>/dev/null || true"
          }
        ]
      }
    ]
  }
}
```

**ChatGPT (mit Dateizugriff/Projekte):** Lade `MEMORY.md` und die
relevanten `projekte/*.md`-Dateien als Projektwissen hoch. Nutze dafür
wenn möglich ein ChatGPT-**Projekt** (projektweite Anweisungen haben mehr
Platz) und füge dort den Inhalt von `CLAUDE.md` ein. Ohne Projekte ist das
Feld für Custom Instructions oft zu kurz für die ganze Datei — dann
reichen als Fallback die drei Kernkonventionen (Tags, Fälligkeiten,
Verknüpfungen).

**Claude.ai-Projekte:** Lade den gesamten Vault-Ordner als Projektwissen
hoch, füge `CLAUDE.md` als Projekt-Anweisungen ein.

**Gemini (Gems):** Lege ein Gem an, füge `CLAUDE.md` als Anweisung ein
und hänge die Vault-Dateien als Wissen an.

**Cursor:** Kopiere den Inhalt von `CLAUDE.md` in eine `.cursorrules`-
Datei im Projektordner.

**Jedes andere Tool:** Füge `MEMORY.md` + `CLAUDE.md` am Anfang eines
Gesprächs ein, oder lade sie hoch, falls das Tool Datei-Uploads erlaubt.

## Konventionen

Siehe `vault-template/CLAUDE.md` — Tags (`#tag`), Fälligkeiten
(`Fällig: YYYY-MM-DD`), Verknüpfungen (`[[dateiname]]`).

## Graph-Viewer

`viewer/graph-viewer.html` + `viewer/graph-viewer.js` gehören zusammen —
immer im selben Ordner halten, dann komplett abhängigkeitsfrei und offline
(kein Server, kein CDN, kein Internet). Beim Öffnen wählst du deinen
Vault-Ordner über den Button „Vault-Ordner öffnen" aus (Chrome/Edge: direkte
Ordnerauswahl; Firefox/Safari: derselbe Button öffnet stattdessen einen
nativen Ordner-Auswahldialog des Betriebssystems). Vier Ansichten stehen
über die Tabs zur Verfügung: Obsidian-2D, Baum (ein-/ausklappbare Liste),
3D-Kugel (mit Maus in alle Richtungen frei drehbar — horizontal und
vertikal ziehen), Matrix. Dazu Suche, Tag-Filter, lokaler Graph
(Klick auf einen Knoten), Zeitleiste und PNG-Export.

Drei Designs stehen oben links zur Wahl: **Dunkel** (Standard), **Hell**
(schlicht) und **Stark** (verspieltes HUD-Design). Die Wahl wird im Browser
gemerkt.

## Obsidian-Kompatibilität

Die Verknüpfungs- (`[[Link]]`) und Tag-Syntax (`#tag`) ist identisch zu
Obsidian — du kannst den Vault-Ordner zusätzlich direkt in Obsidian öffnen,
falls du es installiert hast. Ein `.obsidian`-Konfigurationsordner ist
bewusst nicht enthalten, damit nichts mit einem bestehenden Obsidian-Setup
kollidiert.
