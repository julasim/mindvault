<!--
ANWEISUNG AN CLAUDE: Diese Datei zuerst lesen, um den Ordner zu verstehen.
Bevor du die Arbeit in diesem Ordner beendest: diese Datei aktualisieren —
neue Entscheidungen in den Status, erledigte Punkte aus "Offene Punkte"
entfernen, neue Dateien in die Landkarte, "Zuletzt aktualisiert" + Änderungslog
pflegen. Stufe 1 reicht meist; Stufe 2 nur lesen, wenn die Aufgabe es verlangt.
-->

# mindvault — Vault Graph Viewer (Verkaufsprodukt)

Zuletzt aktualisiert: 2026-10-16

## Worum geht's

Verkaufsfertige, dateibasierte Markdown-Gedächtnis-Vorlage für die Arbeit mit
beliebigen LLM-Programmen (Claude Code, ChatGPT, Gemini, Cursor, Claude.ai-
Projekte), ergänzt um einen eigenständigen, LLM-unabhängigen Graph-Viewer
(zwei offline-fähige Dateien, kein Server, kein LLM-Aufruf) — analog zu
Obsidians Graph-Ansicht, aber ohne Obsidian-Installation. Noch nicht
veröffentlicht, Arbeitsname `mindvault`.

## Status

**Kern:** Vault-Template + Markdown-Parser (Tags `#tag`, Fälligkeit
`Fällig: YYYY-MM-DD`, `[[Links]]` inkl. Alias/Überschrift/Unicode/
case-insensitiv) — reine, abhängigkeitsfreie JS-Module, Node-`node:test`-TDD
(56/56 grün).

**Vier Graph-Ansichten:**
- Obsidian-2D (Kraft-Graph, Zoom/Pan), 3D-Kugel (Fibonacci-Verteilung, per
  Maus um **beide** Achsen frei drehbar — horizontal Gieren/Y, vertikal
  Nicken/X, seit 2026-10-16; vorher nur Y), Matrix (Obergrenze 150 Knoten)
  — Canvas-Renderer.
- Baum — seit dem 2026-10-15-Redesign eine ein-/ausklappbare DOM-Liste
  (`<details>`/`<summary>`, an graphifys Baum-Tab angelehnt) statt
  Canvas-Pixelpositionen. Grund: `detectRootNode` bevorzugt isolierte
  Hub-Namen (MEMORY/CLAUDE) als Root; die alte BFS brach dort ab und warf
  den gesamten Rest des Graphen fälschlich auf eine Ebene. Fix:
  `buildTreeHierarchy` (`src/layout-tree.js`) läuft die BFS jetzt pro
  Zusammenhangskomponente — Regressionstest vorhanden.

**Viewer-UI:** Klick-Info-Panel (Sidebar), lokaler Graph mit Tiefen-Regler,
Tag-Filter mit Zählern, Volltextsuche, Export als PNG, Zeitleiste
(abspielbar) aus `log/INDEX.md`, Root-Knoten-Erkennung.

**Performance (2026-10-16 behoben):** Leistungstest mit synthetischen Vaults
bis 6.000 Dateien zeigte, dass `layoutForceDirected` (Obsidian-2D-Ansicht,
O(n²) pro Iteration) den Tab ab ~1.000 Dateien für Sekunden, ab 3.000+ für
bis zu zwei Minuten einfror — alle anderen Ansichten/Filter/Suche blieben
linear und unter 50ms. Fix: ein Zeitbudget (`timeBudgetMs`, Standard 1200ms)
bricht die Simulation nach jeder Iteration ab, sobald es überschritten ist —
bewusst ohne nennenswerten Iterations-Mindestboden (`minIterations` Standard
1), weil ein fixer Boden wie "mindestens 30 Iterationen" bei sehr großen
Vaults (wo eine einzelne Iteration schon hunderte ms kostet) das Budget
selbst aushebeln würde. Ergebnis: 6.000 Dateien jetzt 1,8s statt 119s
(~68× schneller), alle Größen bleiben nahe am Budget. Zwei Regressionstests
in `test/layout-2d.test.js` sichern das ab.

**Styling:** drei umschaltbare Designs (Topbar-Buttons „Dunkel“/„Hell“/
„Stark“, Wahl in `localStorage` gemerkt), ersetzt das ursprüngliche helle
Sima-Design aus Task 14, nachdem Nutzer-Feedback es als "schrecklich"
einstufte:
- **Dunkel** (Standard) — an graphifys Viewer angelehnt (Topbar + Tabs +
  Sidebar-Panels, glühende Knoten).
- **Hell** — schlichtes, gedämpftes Pendant ohne Glow.
- **Stark** — verspieltes Iron-Man/HUD-Design (Rot/Gold/Cyan, kräftiger
  Glow + Zielring um jeden Knoten, pulsierender „Arc-Reactor“-Punkt im
  Branding, Scanline-Textur hinter Canvas/Baum).
CSS-Variablen in `shell.html` (`[data-theme]`) decken die UI-Chrome ab, das
`THEMES`-Objekt in `render.js` parallel die Canvas-Farben (CSS erreicht
Canvas nicht). Bleibt in allen drei Designs vollständig CDN-frei (keine
Three.js-Abhängigkeit wie bei graphifys echter 3D-Ansicht) — bewusste
Abgrenzung, siehe PRD.md Punkt 5.

**Ausliefer-Artefakt:** zwei Dateien, `viewer/graph-viewer.html` +
`viewer/graph-viewer.js` (immer zusammenhalten) — auf Nutzerwunsch
("wie beim graphify-Output") statt einer einzigen Datei. `node
viewer/build.js` erzeugt beide aus `src/*.js` + `loader.js` + `render.js` +
`shell.html`. Getestet über einen lokalen `python -m http.server`, da
`file://` im Automatisierungs-Tool als `data:`-Snapshot gerendert wird und
externe `<script src>`-Ladung dort nicht direkt prüfbar ist — über HTTP
sauber bestätigt (alle vier Ansichten, Suche, Info-Panel, Export,
Zeitleiste).

**Verkaufsmaterial:** Demo-Vault mit 20 Dateien/16 Projekten (2026-10-15
von 6 auf 20 ausgebaut, dichtes Netz aus ~50 Kanten, 15 Tags), `docs/README.md`
mit Plattform-Adaptern je LLM-Tool, `docs/LICENSE.md` (Einmalkauf, keine
Weitergabe/kein Weiterverkauf).

## Offene Punkte / nächste Schritte

- **Unverifiziert:** der native Ordner-Dialog (`showDirectoryPicker`) beim
  echten Doppelklick-Öffnen über `file://` — **kategorisch nicht
  automatisiert testbar** (2026-10-16 bestätigt: das eingebaute
  Browser-Pane kann `file://`-URLs grundsätzlich nicht öffnen, nur als
  nicht-interaktiven `data:`-Snapshot rendern — kein Werkzeugaufruf hier
  wird das je ändern). Nur manuell durch Julius selbst in Chrome/Edge
  prüfbar: Doppelklick auf `graph-viewer.html`, „Vault-Ordner öffnen",
  `demo-vault` wählen, Graph sollte laden.
- Cross-Browser (Firefox/Safari-Fallback) noch nicht real getestet.
- Kein Auslieferungspaket: `apps/mindvault/` ist aktuell ein kompletter
  Entwicklerordner (PLAN.md, package.json, src/, test/) — Käufer sollten
  nur `vault-template/`, `demo-vault/`, `viewer/graph-viewer.{html,js}`,
  `docs/` bekommen.
- Endgültiger Produktname (Alternativen in PRD.md: Contextline, Threadmark,
  Statepad, Merkfaden).
- Verkaufsplattform (Gumroad/LemonSqueezy/eigene Seite) + Preis — bewusst
  noch nicht entschieden, betrifft nicht den Bau.
- Kein Setup-Skript/CLI (bewusst nicht in v1), keine Branchen-Vorlagen,
  kein Ebene-2-Suchskript — spätere Ausbaustufe, siehe PRD.md „Abgrenzung".

## Konventionen

- Sprache: Deutsch (Doku, Vault-Konventionen, Commit-Messages).
- Tech-Stack-Grenze: Node.js-Abhängigkeiten ausschließlich zur
  Entwicklungszeit (Tests, Build) — niemals Teil des Ausliefer-Artefakts.
- Vault-Syntax ist bewusst Obsidian-kompatibel, aber ohne mitgelieferten
  `.obsidian`-Konfigurationsordner.

---

## Datei-Landkarte

- `PRD.md` — Produktanforderungen: Zielgruppe, Kernfunktionen, bewusste
  Abgrenzung. Lesen vor Scope-Entscheidungen.
- `PLAN.md` — der vollständige 19-Task-Umsetzungsplan (TDD, Step-für-Step
  mit Code). Lesen bei Fragen, *warum* etwas so implementiert ist.
- `src/` — reine, getestete JS-Module: `parser.js` (Tags/Links/Fälligkeit/
  Graph-Aufbau), `layout-2d.js`/`layout-sphere.js`/`layout-matrix.js`
  (Canvas-Layouts), `layout-tree.js` (`buildTreeHierarchy` — Eltern-Kind-
  Struktur für die DOM-Baumliste, keine Pixelpositionen mehr),
  `filters.js` (Tag-/Orphan-Filter + Volltextsuche), `timeline.js`
  (Zeitleiste aus Log), `root.js` (Root-Knoten-Erkennung).
- `viewer/` — `shell.html` (HTML-Gerüst + dunkles Theme, Quelle für
  `graph-viewer.html`), `loader.js` (Datei-System-Zugriff/Drag&Drop),
  `render.js` (drei Canvas-Renderer + `buildTreeDOM` für die Baum-Ansicht +
  alle Interaktion: Zoom/Pan, Kugel-Drehung, Klick, Filter-UI, Export,
  Zeitleiste-Wiedergabe), `build.js` (erzeugt `graph-viewer.html` +
  `graph-viewer.js` aus `shell.html` + allen Source-Modulen — **das**
  Produkt). Nach jeder Source-Änderung `node viewer/build.js` neu laufen
  lassen.
- `vault-template/` — leere Vorlage, die Käufer kopieren, um ihr eigenes
  Gedächtnis zu starten.
- `demo-vault/` — befüllter Beispiel-Vault für den ersten Eindruck im
  Viewer (16 Projekte, mehrere Tag-Cluster, Fälligkeiten, Zeitleiste).
- `docs/README.md` — Schnellstart + Plattform-Adapter je LLM-Tool.
- `docs/LICENSE.md` — Nutzungsbedingungen für Käufer.
- `test/` — ein `node:test`-File pro `src/*.js`-Modul plus
  `demo-vault.test.js` (prüft Demo-Vault-Integrität) und
  `vault-template.test.js` (prüft Pflichtdateien/Konventionen).

---

## Änderungslog

- 2026-10-16 (später) — 3D-Kugel: Drehung auf beide Achsen erweitert
  (`layout-sphere.js` wendet jetzt `rotationX` zusätzlich zu `rotationY`
  an, vertikales Ziehen in `render.js` steuert `sphereManualRotationX`) —
  vorher drehte nur horizontales Ziehen die Kugel. Zwei Regressionstests
  ergänzt (56/56 grün), Ausliefer-Artefakt neu gebaut.
- 2026-10-16 — Gründlicher Test (Funktions-, Leistungstest bis 6.000
  Dateien, Browser-Test aller vier Ansichten/drei Designs mit dem
  Demo-Vault): Leistungsfund `layoutForceDirected` (O(n²), fror bei großen
  Vaults den Tab ein) behoben per Zeitbudget, zwei Regressionstests
  ergänzt, Ausliefer-Artefakt neu gebaut. Redesign-Stand vom 15.10. zuvor
  committet (`a1af807`).
- 2026-10-15 (später) — Drei umschaltbare Designs ergänzt (Dunkel/Hell/
  Stark-HUD), `THEMES`-Objekt in `render.js` + `[data-theme]`-CSS-Tokens in
  `shell.html`, Wahl in `localStorage` gemerkt.
- 2026-10-15 — Graphify-inspiriertes Redesign: Baum-Kollaps-Bug gefunden
  und behoben (`buildTreeHierarchy`, BFS pro Komponente), Baum-Ansicht als
  DOM-Liste neu gebaut, dunkles Theme statt hellem Sima-Design, Ausliefer-
  Artefakt auf zwei Dateien (`graph-viewer.html`+`.js`) umgestellt,
  Demo-Vault auf 20 Dateien/16 Projekte ausgebaut.
- 2026-10-11/12 — Produkt komplett nach PLAN.md gebaut (19 Tasks), inkl.
  mehrerer Review-Fix-Runden; 49/49 Tests grün.
- 2026-10-12 — Gegen PLAN.md geprüft (Claude Code): Umsetzung vollständig
  plankonform befunden; einziger offener Nacharbeit-Schritt (diese
  CLAUDE.md + Workspace-Landkarten-Zeile) nachgeholt.
