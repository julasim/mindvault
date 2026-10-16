# PRD — mindvault (Arbeitsname)

Stand: 2026-10-16 · Status: Kern fertig und getestet (56/56 Tests),
Verkaufsvorbereitung (Produktname, Plattform, Auslieferungspaket) offen

## Eine-Satz-Zusammenfassung

Eine fertige, verkaufbare Markdown-Gedächtnis-Vorlage für die Arbeit mit
beliebigen KI-/LLM-Programmen, die ihre Verlinkungen und Tags zusätzlich
in einem eigenständigen, LLM-unabhängigen Graph-Viewer sichtbar macht —
ähnlich Obsidians Graph-Ansicht, aber ohne Obsidian-Installation nötig.

## Problem

Wer mit mehreren KI-Tools arbeitet, hat kein persistentes Gedächtnis über
Projekte/Entscheidungen hinweg — jede neue Sitzung startet bei null. Ein
dateibasiertes Markdown-Gedächtnis löst das, ist aber bisher ein privates
Bastel-Setup (Julius' eigenes System), nicht verkaufsfertig, nicht visuell
nachvollziehbar und nicht für Nicht-Programmierer geprüft.

## Zielgruppe

Jeder, der mit irgendeinem LLM-Programm arbeitet (Claude Code, ChatGPT,
Gemini, Cursor, Claude.ai-Projekte etc.) und über Sitzungen hinweg Kontext
behalten will — technisch versiert bis technisch unversiert. Keine
Einschränkung auf eine Berufsgruppe in v1.

## Kernfunktionen (v1 — zwingend)

1. **Portable Markdown-Vault-Struktur** (Ebene 1, funktioniert überall):
   - `MEMORY.md` (Index), `projekte/<name>.md`, `entscheidungen.md`,
   `log/INDEX.md`, `CLAUDE.md` (Pflegeanleitung für das jeweilige LLM).
   - Schreiben nur bei explizitem Wunsch oder klarer Entscheidung/Stand-
   änderung — kurz, konkret, mit Datum, ergänzend statt wiederholend.
2. **Tagging:** `#tag` inline im Fließtext von Projekt-/Entscheidungs-/
   Log-Einträgen. Kein separates Register.
3. **Fälligkeiten:** optionales Feld `Fällig: YYYY-MM-DD` bei offenen
   Punkten. Keine aktive Erinnerung (System ist passiv) — Pflegeregel:
   beim Laden von MEMORY.md überfällige/anstehende Punkte nennen (Hook,
   wo verfügbar; sonst auf Zuruf).
4. **Verknüpfungen:** `[[dateiname]]`-Wikilink-Syntax (Obsidian-kompatible
   Syntax, kein mitgelieferter `.obsidian`-Konfigurationsordner). Jede
   Datei bekommt einen "Verwandte Einträge"-Abschnitt für eingehende Links,
   vom LLM gepflegt.
5. **Graph-Viewer — das Alleinstellungsmerkmal:**
   - Zwei abhängigkeitsfreie, lokale Dateien (`graph-viewer.html` +
     `graph-viewer.js`, immer im selben Ordner) statt einer einzigen
     Datei — bewusste Entscheidung für eine klarere Struktur (wie ein
     einfaches, lesbares Webprojekt), weiterhin kein Server, kein CDN,
     kein Internet nötig. Nutzer öffnet `graph-viewer.html` per
     Doppelklick, wählt den Vault-Ordner (File System Access API /
     Drag&Drop-Fallback für ältere Browser).
   - Topbar mit Ansichts-Tabs, Sidebar mit Info-/Zeitleiste-/Tag-Panels,
     statt des ursprünglichen hellen Sima-Designs — bewusste Korrektur
     nach Nutzer-Feedback, dass die erste, helle Fassung "schrecklich
     aussieht". Weiterhin reines Canvas/DOM, keine Three.js/CDN-
     Abhängigkeit wie bei graphifys echter 3D-Ansicht.
   - **Drei umschaltbare Designs** (Topbar-Buttons, Wahl in `localStorage`
     gemerkt): **Dunkel** (Standard, an graphifys Viewer angelehnt,
     glühende Knoten), **Hell** (schlicht, gedämpft, kein Glow), **Stark**
     (verspieltes Iron-Man/HUD-Design: Rot/Gold/Cyan, Zielring um jeden
     Knoten, pulsierender Punkt im Branding, Scanline-Textur).
   - **Muss ohne LLM-Aufruf funktionieren** — reines JavaScript parst die
     `.md`-Dateien nach `[[Links]]` und `#Tags` und zeichnet den Graphen
     clientseitig. Keine Server-Anfrage, kein API-Key, kein Internet nötig.
   - Vier Ansichten mit Umschalter: **Obsidian-2D** (Kraft-Graph), **Baum**,
     **3D-Kugel** (per Maus frei drehbar — horizontal und vertikal, nicht
     nur um die senkrechte Achse), **Matrix** — analog zu den vier
     Ansichten aus Julius' bestehendem graphify-HTML-Viewer-Patch, hier
     aber neu und eigenständig gebaut (keine Laufzeit-Abhängigkeit von
     graphify/Claude Code).
   - Knoten mit radialem Farbverlauf und dünner Kontur (Glaskugel-Optik)
     statt flacher Einfarb-Füllung, in allen drei Designs.
   - Obsidian-2D-Ansicht im Detail (Vorbild: offizielle Obsidian-Graph-
     Dokumentation):
     - Knoten = Dateien, Linien = Links, Knotengröße nach Anzahl
       eingehender Links.
     - Hover hebt Verbindungen hervor, Klick öffnet/zeigt den Dateiinhalt.
     - Zoom/Pan.
     - Suche + Filter: Tags ein/ausblenden, verwaiste Notizen (ohne Links)
       ein/ausblenden.
     - Farbgruppen nach Tag (ersetzt Obsidians freie Gruppen-Suche).
     - Lokaler Graph: nur mit der gewählten Datei verknüpfte Notizen,
       mit Tiefen-Regler.
     - Kräfte-Regler (Repel-/Link-Distanz) — niedrige Priorität, kein
       Blocker für v1.
   - **Export/Snapshot:** Button exportiert die aktuelle Graph-Ansicht als
     PNG/SVG. Rein clientseitig (Canvas/SVG-Serialisierung), kein Server.
   - **Zeitleiste/Verlauf:** Abspielbare Chronologie auf Basis der
     Datumsangaben in `log/INDEX.md` — zeigt, wie der Vault über die Zeit
     gewachsen ist (analog Obsidians Timelapse, aber eigenständig).
   - **Volltextsuche im Viewer:** Suche über den Fließtext aller
     `.md`-Dateien direkt im Browser (reines JS, kein LLM) — nicht nur
     Datei-/Tag-Filter.
6. **Demo-Vault:** ein mitgelieferter Beispiel-Vault mit sinnvollen,
   anonymisierten Beispieldaten (Projekte, Entscheidungen, Log-Einträge,
   Tags, Fälligkeiten, Verlinkungen) — Käufer sehen den Graph-Viewer sofort
   in Aktion, bevor eigene Daten eingetragen sind. Senkt die Einstiegshürde
   und dient als Verkaufs-/Demo-Material.
7. **Plattform-Adapter:** Claude-Code-Hook (`SessionStart`, automatisches
   Laden von MEMORY.md) + kurze, konkrete Anleitungen für ChatGPT,
   Claude.ai-Projekte, Gemini, Cursor (manuelles Hochladen/Einfügen).
8. **Lizenz/Rechtliches:** Einmalkauf, persönliche Nutzung, keine
   Weitergabe/kein Weiterverkauf der Vorlage selbst.

## Bewusste Abgrenzung (NICHT in v1)

- Kein Setup-Skript/CLI, das den Ordner automatisch anlegt.
- Keine Branchen-/Rollen-Vorlagen (Freelancer-Edition etc.).
- Kein Ebene-2-Suchskript (deterministisches Durchsuchen für agentenfähige
  Tools) — spätere Ausbaustufe.
- Kein Abo-Modell, keine gestaffelten Editionen.
- Kein mitgelieferter `.obsidian`-Konfigurationsordner.

## Offene Punkte für den Implementierungsplan

- Endgültiger Produktname (Arbeitsname `mindvault`, Alternativen:
  Contextline, Threadmark, Statepad, Merkfaden).
- Verkaufsplattform (Gumroad/LemonSqueezy/eigene Seite) — bewusst später,
  betrifft nicht den Bau des Produkts selbst.
- Technische Umsetzung des Graph-Viewers (Bibliothek für Kraft-Graph/3D,
  Browser-Kompatibilität der File System Access API, Fallback-Verhalten).
