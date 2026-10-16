# mindvault — Dateibasiertes Gedächtnis für jedes LLM

Eine portable Markdown-Vault-Struktur für die Arbeit mit beliebigen
KI-/LLM-Programmen (Claude Code, ChatGPT, Gemini, Cursor, Claude.ai-Projekte),
ergänzt um einen eigenständigen, LLM-unabhängigen Graph-Viewer — analog zu
Obsidians Graph-Ansicht, aber ohne Obsidian-Installation. Läuft komplett
offline, ohne Server, ohne LLM-Aufruf, ohne Internet.

![Obsidian-2D-Ansicht](docs/images/01-obsidian-2d-dunkel.png)

<details>
<summary>Weitere Ansichten (Baum, 3D-Kugel, Matrix, Stark-Design)</summary>

| Baum | Matrix |
|---|---|
| ![Baum-Ansicht](docs/images/02-baum-dunkel.jpg) | ![Matrix-Ansicht](docs/images/04-matrix-dunkel.jpg) |

| 3D-Kugel (Dunkel) | 3D-Kugel (Stark-HUD-Design) |
|---|---|
| ![3D-Kugel, Dunkel](docs/images/03-3d-kugel-dunkel.jpg) | ![3D-Kugel, Stark-Design](docs/images/05-3d-kugel-stark.jpg) |

</details>

## Schnellstart

1. Kopiere `vault-template/` an einen Ort deiner Wahl, z.B. `mein-gedaechtnis/`.
2. Öffne `viewer/graph-viewer.html` per Doppelklick, um deinen Vault jederzeit
   visuell zu sehen.
3. Schau dir zuerst `demo-vault/` im Viewer an, um zu sehen, wie ein befüllter
   Vault aussieht.

## Einrichtung je Plattform

**Claude Code:** Lege im Vault-Ordner eine `.claude/settings.json` mit
folgendem Inhalt an, damit Claude Code `MEMORY.md` bei jedem Sitzungsstart
automatisch lädt:

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

**ChatGPT (mit Dateizugriff/Projekte):** Lade `MEMORY.md` und die relevanten
`projekte/*.md`-Dateien als Projektwissen hoch. Nutze dafür wenn möglich ein
ChatGPT-**Projekt** (projektweite Anweisungen haben mehr Platz) und füge dort
den Inhalt von `vault-template/CLAUDE.md` ein. Ohne Projekte ist das Feld für
Custom Instructions oft zu kurz für die ganze Datei — dann reichen als
Fallback die drei Kernkonventionen (Tags, Fälligkeiten, Verknüpfungen).

**Claude.ai-Projekte:** Lade den gesamten Vault-Ordner als Projektwissen hoch,
füge `vault-template/CLAUDE.md` als Projekt-Anweisungen ein.

**Gemini (Gems):** Lege ein Gem an, füge `vault-template/CLAUDE.md` als
Anweisung ein und hänge die Vault-Dateien als Wissen an.

**Cursor:** Kopiere den Inhalt von `vault-template/CLAUDE.md` in eine
`.cursorrules`-Datei im Projektordner.

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
nativen Ordner-Auswahldialog des Betriebssystems). Vier Ansichten stehen über
die Tabs zur Verfügung: Obsidian-2D, Baum (ein-/ausklappbare Liste), 3D-Kugel
(mit Maus in alle Richtungen frei drehbar — horizontal und vertikal ziehen),
Matrix. Dazu Suche, Tag-Filter, lokaler Graph (Klick auf einen Knoten),
Zeitleiste und PNG-Export.

Drei Designs stehen oben links zur Wahl: **Dunkel** (Standard), **Hell**
(schlicht) und **Stark** (verspieltes HUD-Design). Die Wahl wird im Browser
gemerkt.

## Obsidian-Kompatibilität

Die Verknüpfungs- (`[[Link]]`) und Tag-Syntax (`#tag`) ist identisch zu
Obsidian — du kannst den Vault-Ordner zusätzlich direkt in Obsidian öffnen,
falls du es installiert hast. Ein `.obsidian`-Konfigurationsordner ist
bewusst nicht enthalten, damit nichts mit einem bestehenden Obsidian-Setup
kollidiert.

## Entwicklung

Der Viewer (`viewer/graph-viewer.html` + `viewer/graph-viewer.js`) wird aus
den Quellmodulen in `src/` + `viewer/shell.html`/`loader.js`/`render.js`
gebaut:

```bash
npm test            # node:test, läuft alle Module in src/
npm run build        # erzeugt viewer/graph-viewer.{html,js} neu
```

Node.js-Abhängigkeiten existieren ausschließlich zur Entwicklungszeit (Tests,
Build) — das Ausliefer-Artefakt selbst ist zwei abhängigkeitsfreie Dateien.

## Weitere Dokumentation

- [docs/ANLEITUNG.md](docs/ANLEITUNG.md) — ausführliche, nicht-technische
  Anleitung für Nutzer ohne Programmiervorkenntnisse.
- [docs/LLM-ANLEITUNG.md](docs/LLM-ANLEITUNG.md) — ausführliche
  Pflegeanleitung für KI-Assistenten (Grundlage für `vault-template/CLAUDE.md`,
  auch als Referenz für eigene Skills/Implementierungen).

## Lizenz

MIT — siehe [LICENSE](LICENSE).
