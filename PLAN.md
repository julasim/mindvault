# mindvault Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein verkaufsfertiges, dateibasiertes Gedächtnis-System (Markdown-Vault)
für beliebige LLM-Programme bauen, inklusive eines eigenständigen,
LLM-unabhängigen Graph-Viewers mit vier Ansichten (Obsidian-2D, Baum,
3D-Kugel, Matrix), Suche, Export, Zeitleiste und einem befüllten Demo-Vault.

**Architecture:** Alle Graph-Logik (Parsen, Layout, Filter, Zeitleiste) wird
als reine, abhängigkeitsfreie JavaScript-Funktionen geschrieben und mit
Node's eingebautem Test-Runner (`node --test`) TDD-getestet. Ein kleines
Build-Skript (nur zur Entwicklungszeit, nicht Teil des Verkaufsprodukts)
fügt diese Module zu einer einzigen `graph-viewer.html` zusammen, die der
Käufer per Doppelklick öffnet — keine Installation, kein Server, kein
Internet, kein LLM-Aufruf.

**Tech Stack:** Vanille-JavaScript (ES-Module während der Entwicklung, zu
einer Datei zusammengefügt für den Versand), HTML5 Canvas, Node.js
`node:test`/`node:assert` nur für die Entwicklung. Keine Frameworks, keine
Drittanbieter-Bibliotheken im Ausliefer-Artefakt.

**Spec:** [PRD.md](./PRD.md)

## Global Constraints

- Ausliefer-Artefakt `viewer/graph-viewer.html` lädt **keine** externen
  Skripte, CDN-Links oder Netzwerkressourcen und ruft **kein** LLM auf —
  muss vollständig offline funktionieren (PRD Punkt 5).
- Vault-Konventionen exakt wie in der PRD: Tags `#tag`, Fälligkeit
  `Fällig: YYYY-MM-DD`, Verknüpfung `[[dateiname]]` (PRD Punkte 2–4).
- Kein mitgelieferter `.obsidian`-Konfigurationsordner (PRD, Abgrenzung).
- Browser-Unterstützung: File System Access API als primärer Lade-Weg,
  Drag&Drop/`webkitdirectory`-Datei-Input als Fallback für Browser ohne
  diese API (PRD Punkt 5).
- Node.js-Abhängigkeiten ausschließlich zur Entwicklungszeit (Tests,
  Build-Skript) — niemals Teil des Verkaufsprodukts.
- Lizenztext: Einmalkauf, persönliche Nutzung, keine Weitergabe/kein
  Weiterverkauf der Vorlage selbst (PRD Punkt 8).

## Review Focus

- **Leerer/einzelner Knoten ohne Links:** Graph darf nicht abstürzen oder
  eine leere/kaputte Zeichnung erzeugen, wenn ein Vault nur eine einzige,
  unverlinkte Datei enthält.
- **Zirkuläre Verlinkung (A→B→A, Selbstverweis `[[gleiche-datei]]`):**
  Layout-Berechnung darf nicht in eine Endlosschleife laufen oder
  doppelte Kanten erzeugen.
- **Umlaute/Unicode in Dateinamen** (typisch für deutsche Vaults, z.B.
  `Entscheidungen-Übersicht.md`): Link-Auflösung muss solche Dateinamen
  korrekt und case-insensitiv auflösen, nicht nur ASCII-Namen.
- **Großer Vault (mehrere hundert Dateien):** Layout-Berechnung darf den
  Browser-Tab nicht für mehrere Sekunden einfrieren — Zeitbudget prüfen.
- **Fehlerhaftes/fehlendes Fälligkeitsdatum** (falsches Format, leeres
  Feld): Zeitleisten-/Überfällig-Logik darf nicht werfen, muss den
  Eintrag einfach überspringen.

---

## Task 1: Projekt-Grundgerüst + Vault-Template-Kern

**Files:**
- Create: `apps/mindvault/package.json`
- Create: `apps/mindvault/.gitignore`
- Create: `apps/mindvault/vault-template/MEMORY.md`
- Create: `apps/mindvault/vault-template/CLAUDE.md`
- Create: `apps/mindvault/vault-template/entscheidungen.md`
- Create: `apps/mindvault/vault-template/log/INDEX.md`
- Create: `apps/mindvault/vault-template/projekte/beispiel-projekt.md`
- Test: `apps/mindvault/test/vault-template.test.js`

**Interfaces:**
- Produces: die Ordnerstruktur `vault-template/` als Vorlage, die spätere
  Tasks (Demo-Vault, README) als Grundlage kopieren.

- [ ] **Step 1: Projektordner initialisieren**

```bash
cd apps/mindvault
git init
```

```json
// package.json
{
  "name": "mindvault",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test test/",
    "build": "node viewer/build.js"
  }
}
```

```
# .gitignore
node_modules/
```

- [ ] **Step 2: Vault-Kerndateien anlegen**

```markdown
<!-- vault-template/MEMORY.md -->
# Gedächtnis-Index

Eine Zeile pro Projekt/Thema, verlinkt auf die jeweilige Datei. Tags am
Zeilenende sind optional sichtbar, damit man sie beim Überfliegen schon
ohne Nachfrage erkennt.

- [Beispiel-Projekt](projekte/beispiel-projekt.md) — kurzer Hook-Satz, wofür die Datei steht #beispiel
```

```markdown
<!-- vault-template/CLAUDE.md -->
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

Öffne `graph-viewer.html` (im übergeordneten Ordner oder neben diesem
Vault) per Doppelklick, um die Verknüpfungen zwischen allen Dateien
visuell zu sehen — läuft offline, ohne LLM.
```

```markdown
<!-- vault-template/entscheidungen.md -->
# Entscheidungen

Neuester Eintrag oben, mit Datum und kurzer Begründung ("Warum").

<!-- Beispiel:
## 2026-01-01 — Kurzer Titel der Entscheidung
Warum: Ein Satz, der die Begründung nennt.
-->
```

```markdown
<!-- vault-template/log/INDEX.md -->
# Sitzungs-Log

Eine Zeile pro Arbeitssitzung (Datum, was passiert ist, gut/schlecht
gelaufen).

<!-- Beispiel:
- 2026-01-01 — Projekt X aufgesetzt, lief gut.
-->
```

```markdown
<!-- vault-template/projekte/beispiel-projekt.md -->
# Beispiel-Projekt

Stand: (Datum) · #beispiel

## Aktueller Stand

Kurzbeschreibung, wo das Projekt gerade steht.

## Offene Punkte

- Offener Punkt, optional mit Fälligkeit: Fällig: 2026-12-01

## Verwandte Einträge

- [[entscheidungen]]
```

- [ ] **Step 2b: Testdatei schreiben, die die Pflichtdateien und Kern-Konventionen prüft**

```javascript
// test/vault-template.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const base = new URL('../vault-template/', import.meta.url);

test('alle Pflichtdateien des Vault-Templates existieren', () => {
  const required = [
    'MEMORY.md', 'CLAUDE.md', 'entscheidungen.md',
    'log/INDEX.md', 'projekte/beispiel-projekt.md',
  ];
  for (const path of required) {
    assert.ok(existsSync(new URL(path, base)), `${path} fehlt`);
  }
});

test('CLAUDE.md dokumentiert alle drei Konventionen', () => {
  const content = readFileSync(new URL('CLAUDE.md', base), 'utf8');
  assert.match(content, /#tag/);
  assert.match(content, /Fällig: YYYY-MM-DD/);
  assert.match(content, /\[\[dateiname\]\]/);
});
```

- [ ] **Step 3: Test ausführen**

Run: `cd apps/mindvault && node --test test/vault-template.test.js`
Expected: beide Tests PASS (Dateien wurden in Step 2 bereits angelegt).

- [ ] **Step 4: Commit**

```bash
git add package.json .gitignore vault-template/ test/vault-template.test.js
git commit -m "feat: Vault-Template-Grundgerüst anlegen"
```

---

## Task 2: Markdown-Parser (Tags, Links, Fälligkeit, Graph-Aufbau)

**Files:**
- Create: `apps/mindvault/src/parser.js`
- Test: `apps/mindvault/test/parser.test.js`

**Interfaces:**
- Produces: `parseMarkdown(content: string) -> { tags: string[], links: string[], due: string|null }`
- Produces: `buildGraph(files: Map<string,string>) -> { nodes: Array<{id, tags, due, incoming, orphan}>, edges: Array<{source, target}> }`
- Consumes (später, Task 9): wird vom Datei-Lader mit den eingelesenen
  `.md`-Dateien aufgerufen.

- [ ] **Step 1: Fehlschlagende Tests schreiben**

```javascript
// test/parser.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMarkdown, buildGraph } from '../src/parser.js';

test('parseMarkdown extrahiert Tags, Links und Fälligkeit', () => {
  const content = '#patio #security Fällig: 2026-11-01 siehe [[entscheidungen]] und [[projekte/patio]]';
  const result = parseMarkdown(content);
  assert.deepEqual(result.tags, ['patio', 'security']);
  assert.deepEqual(result.links, ['entscheidungen', 'projekte/patio']);
  assert.equal(result.due, '2026-11-01');
});

test('parseMarkdown liefert null bei fehlendem/fehlerhaftem Fälligkeitsdatum', () => {
  assert.equal(parseMarkdown('kein Datum hier').due, null);
  assert.equal(parseMarkdown('Fällig: nächsten Montag').due, null);
});

test('buildGraph zählt eingehende Links und erkennt verwaiste Dateien', () => {
  const files = new Map([
    ['a.md', 'siehe [[b]]'],
    ['b.md', 'kein Link'],
    ['c.md', 'ganz allein'],
  ]);
  const { nodes, edges } = buildGraph(files);
  assert.equal(edges.length, 1);
  assert.equal(nodes.find(n => n.id === 'b').incoming, 1);
  assert.equal(nodes.find(n => n.id === 'c').orphan, true);
});

test('buildGraph löst Unicode-Dateinamen case-insensitiv auf', () => {
  const files = new Map([
    ['Entscheidungen-Übersicht.md', 'Startpunkt'],
    ['projekt.md', 'siehe [[entscheidungen-übersicht]]'],
  ]);
  const { edges } = buildGraph(files);
  assert.equal(edges.length, 1);
  assert.equal(edges[0].target, 'Entscheidungen-Übersicht');
});

test('buildGraph bricht bei zirkulärer Verlinkung (A→B→A) nicht ab und erzeugt keine Dopplungen', () => {
  const files = new Map([
    ['a.md', 'siehe [[b]]'],
    ['b.md', 'siehe [[a]]'],
  ]);
  const { edges } = buildGraph(files);
  assert.equal(edges.length, 2);
});

test('buildGraph ignoriert Selbstverweise', () => {
  const files = new Map([['a.md', 'siehe [[a]]']]);
  const { edges } = buildGraph(files);
  assert.equal(edges.length, 0);
});
```

- [ ] **Step 2: Tests ausführen, Fehlschlag bestätigen**

Run: `node --test test/parser.test.js`
Expected: FAIL mit "Cannot find module '../src/parser.js'"

- [ ] **Step 3: Implementierung schreiben**

```javascript
// src/parser.js
export function parseMarkdown(content) {
  const tags = [...content.matchAll(/#([a-zA-ZäöüÄÖÜß0-9_-]+)/g)].map(m => m[1]);
  const links = [...content.matchAll(/\[\[([^\]]+)\]\]/g)].map(m => m[1].trim());
  const dueMatch = content.match(/Fällig:\s*(\d{4}-\d{2}-\d{2})/);
  return {
    tags: [...new Set(tags)],
    links: [...new Set(links)],
    due: dueMatch ? dueMatch[1] : null,
  };
}

export function buildGraph(files) {
  const idByLowerName = new Map();
  for (const filename of files.keys()) {
    const id = filename.replace(/\.md$/i, '');
    idByLowerName.set(id.toLowerCase(), id);
  }

  const parsedById = new Map();
  for (const [filename, content] of files) {
    const id = filename.replace(/\.md$/i, '');
    parsedById.set(id, parseMarkdown(content));
  }

  const edges = [];
  const incoming = new Map([...idByLowerName.values()].map(id => [id, 0]));
  const hasOutgoing = new Set();

  for (const [id, data] of parsedById) {
    for (const rawLink of data.links) {
      const targetId = idByLowerName.get(rawLink.toLowerCase());
      if (!targetId || targetId === id) continue;
      edges.push({ source: id, target: targetId });
      incoming.set(targetId, (incoming.get(targetId) ?? 0) + 1);
      hasOutgoing.add(id);
    }
  }

  const nodes = [...parsedById].map(([id, data]) => ({
    id,
    tags: data.tags,
    due: data.due,
    incoming: incoming.get(id) ?? 0,
    orphan: (incoming.get(id) ?? 0) === 0 && !hasOutgoing.has(id),
  }));

  return { nodes, edges };
}
```

- [ ] **Step 4: Tests ausführen, Erfolg bestätigen**

Run: `node --test test/parser.test.js`
Expected: alle 6 Tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/parser.js test/parser.test.js
git commit -m "feat: Markdown-Parser für Tags, Links und Fälligkeiten"
```

---

## Task 3: 2D-Kraft-Graph-Layout (Obsidian-Stil)

**Files:**
- Create: `apps/mindvault/src/layout-2d.js`
- Test: `apps/mindvault/test/layout-2d.test.js`

**Interfaces:**
- Consumes: `nodes: Array<{id, incoming}>`, `edges: Array<{source, target}>` (aus Task 2)
- Produces: `layoutForceDirected(nodes, edges, options?) -> { [id]: {x, y} }`

- [ ] **Step 1: Fehlschlagende Tests schreiben**

```javascript
// test/layout-2d.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutForceDirected } from '../src/layout-2d.js';

test('platziert jeden Knoten innerhalb der Grenzen und ist deterministisch', () => {
  const nodes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const edges = [{ source: 'a', target: 'b' }];
  const p1 = layoutForceDirected(nodes, edges, { width: 400, height: 300, iterations: 50 });
  const p2 = layoutForceDirected(nodes, edges, { width: 400, height: 300, iterations: 50 });
  assert.deepEqual(p1, p2);
  for (const id of ['a', 'b', 'c']) {
    assert.ok(Number.isFinite(p1[id].x) && Number.isFinite(p1[id].y));
    assert.ok(p1[id].x >= 0 && p1[id].x <= 400);
  }
});

test('einzelner Knoten ohne Kanten (leerer/verwaister Vault) stürzt nicht ab', () => {
  const positions = layoutForceDirected([{ id: 'solo' }], [], { iterations: 10 });
  assert.ok(positions.solo);
  assert.ok(Number.isFinite(positions.solo.x));
});

test('leerer Knoten-Satz liefert leeres Ergebnis ohne Fehler', () => {
  assert.deepEqual(layoutForceDirected([], []), {});
});

test('zirkuläre Kanten (A→B, B→A) laufen nicht in eine Endlosschleife und terminieren', () => {
  const nodes = [{ id: 'a' }, { id: 'b' }];
  const edges = [{ source: 'a', target: 'b' }, { source: 'b', target: 'a' }];
  const start = Date.now();
  const positions = layoutForceDirected(nodes, edges, { iterations: 100 });
  assert.ok(Date.now() - start < 1000);
  assert.ok(positions.a && positions.b);
});

test('großer Vault (300 Knoten) bleibt innerhalb eines Zeitbudgets', () => {
  const nodes = Array.from({ length: 300 }, (_, i) => ({ id: `n${i}` }));
  const edges = Array.from({ length: 150 }, (_, i) => ({ source: `n${i}`, target: `n${(i + 1) % 300}` }));
  const start = Date.now();
  layoutForceDirected(nodes, edges, { iterations: 80 });
  assert.ok(Date.now() - start < 3000, 'Layout-Berechnung darf den Tab nicht mehrere Sekunden einfrieren');
});
```

- [ ] **Step 2: Tests ausführen, Fehlschlag bestätigen**

Run: `node --test test/layout-2d.test.js`
Expected: FAIL mit "Cannot find module '../src/layout-2d.js'"

- [ ] **Step 3: Implementierung schreiben**

```javascript
// src/layout-2d.js
export function layoutForceDirected(nodes, edges, options = {}) {
  if (nodes.length === 0) return {};

  const width = options.width ?? 800;
  const height = options.height ?? 600;
  const iterations = options.iterations ?? 200;
  const repelStrength = options.repelStrength ?? 2000;
  const linkDistance = options.linkDistance ?? 80;

  const positions = new Map();
  nodes.forEach((n, i) => {
    const angle = (i / nodes.length) * Math.PI * 2;
    positions.set(n.id, {
      x: width / 2 + Math.cos(angle) * 100,
      y: height / 2 + Math.sin(angle) * 100,
      vx: 0,
      vy: 0,
    });
  });

  for (let iter = 0; iter < iterations; iter++) {
    for (const n of nodes) {
      const p = positions.get(n.id);
      let fx = 0, fy = 0;
      for (const other of nodes) {
        if (other.id === n.id) continue;
        const o = positions.get(other.id);
        const dx = p.x - o.x, dy = p.y - o.y;
        const distSq = Math.max(dx * dx + dy * dy, 1);
        const force = repelStrength / distSq;
        fx += (dx / Math.sqrt(distSq)) * force;
        fy += (dy / Math.sqrt(distSq)) * force;
      }
      p.vx = (p.vx + fx) * 0.85;
      p.vy = (p.vy + fy) * 0.85;
    }
    for (const e of edges) {
      const s = positions.get(e.source), t = positions.get(e.target);
      if (!s || !t) continue;
      const dx = t.x - s.x, dy = t.y - s.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const diff = (dist - linkDistance) * 0.05;
      const ux = dx / dist, uy = dy / dist;
      s.vx += ux * diff; s.vy += uy * diff;
      t.vx -= ux * diff; t.vy -= uy * diff;
    }
    for (const n of nodes) {
      const p = positions.get(n.id);
      p.x = Math.min(Math.max(p.x + p.vx, 20), width - 20);
      p.y = Math.min(Math.max(p.y + p.vy, 20), height - 20);
    }
  }

  const result = {};
  for (const [id, p] of positions) result[id] = { x: p.x, y: p.y };
  return result;
}
```

- [ ] **Step 4: Tests ausführen, Erfolg bestätigen**

Run: `node --test test/layout-2d.test.js`
Expected: alle 5 Tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/layout-2d.js test/layout-2d.test.js
git commit -m "feat: deterministisches Kraft-Graph-Layout für die Obsidian-2D-Ansicht"
```

---

## Task 4: Filter & Volltextsuche

**Files:**
- Create: `apps/mindvault/src/filters.js`
- Test: `apps/mindvault/test/filters.test.js`

**Interfaces:**
- Consumes: `graph: { nodes, edges }` (aus Task 2)
- Produces: `applyFilters(graph, { activeTags?, hideOrphans?, query? }) -> { nodes, edges }`
- Produces: `searchFullText(files: Map<string,string>, query: string) -> Array<{filename, excerpt, index}>`

- [ ] **Step 1: Fehlschlagende Tests schreiben**

```javascript
// test/filters.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyFilters, searchFullText } from '../src/filters.js';

const graph = {
  nodes: [
    { id: 'a', tags: ['patio'], orphan: false },
    { id: 'b', tags: ['security'], orphan: false },
    { id: 'c', tags: [], orphan: true },
  ],
  edges: [{ source: 'a', target: 'b' }],
};

test('activeTags filtert auf passende Knoten und zugehörige Kanten', () => {
  const result = applyFilters(graph, { activeTags: ['patio'] });
  assert.deepEqual(result.nodes.map(n => n.id), ['a']);
  assert.equal(result.edges.length, 0);
});

test('hideOrphans blendet verwaiste Knoten aus', () => {
  const result = applyFilters(graph, { hideOrphans: true });
  assert.ok(!result.nodes.some(n => n.id === 'c'));
});

test('query filtert nach Dateiname-Teilstring, case-insensitiv', () => {
  const result = applyFilters(graph, { query: 'A' });
  assert.deepEqual(result.nodes.map(n => n.id), ['a']);
});

test('ohne Filter bleibt der gesamte Graph erhalten', () => {
  const result = applyFilters(graph, {});
  assert.equal(result.nodes.length, 3);
});

test('searchFullText findet alle Treffer mit Kontext-Ausschnitt', () => {
  const files = new Map([['a.md', 'Hier steht Patio-Security Kontext.']]);
  const matches = searchFullText(files, 'Security');
  assert.equal(matches.length, 1);
  assert.match(matches[0].excerpt, /Security/i);
});

test('searchFullText liefert leeres Array bei leerer Anfrage', () => {
  assert.deepEqual(searchFullText(new Map([['a.md', 'x']]), ''), []);
});
```

- [ ] **Step 2: Tests ausführen, Fehlschlag bestätigen**

Run: `node --test test/filters.test.js`
Expected: FAIL mit "Cannot find module '../src/filters.js'"

- [ ] **Step 3: Implementierung schreiben**

```javascript
// src/filters.js
export function applyFilters(graph, filters = {}) {
  const { activeTags = null, hideOrphans = false, query = '' } = filters;
  const q = query.trim().toLowerCase();

  const nodes = graph.nodes.filter(n => {
    if (hideOrphans && n.orphan) return false;
    if (activeTags && activeTags.length > 0 && !n.tags.some(t => activeTags.includes(t))) return false;
    if (q && !n.id.toLowerCase().includes(q)) return false;
    return true;
  });
  const keep = new Set(nodes.map(n => n.id));
  const edges = graph.edges.filter(e => keep.has(e.source) && keep.has(e.target));
  return { nodes, edges };
}

export function searchFullText(files, query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const matches = [];
  for (const [filename, content] of files) {
    const lower = content.toLowerCase();
    let index = lower.indexOf(q);
    while (index !== -1) {
      const start = Math.max(0, index - 30);
      const end = Math.min(content.length, index + q.length + 30);
      matches.push({ filename, excerpt: content.slice(start, end), index });
      index = lower.indexOf(q, index + q.length);
    }
  }
  return matches;
}
```

- [ ] **Step 4: Tests ausführen, Erfolg bestätigen**

Run: `node --test test/filters.test.js`
Expected: alle 6 Tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/filters.js test/filters.test.js
git commit -m "feat: Tag-/Orphan-Filter und Volltextsuche"
```

---

## Task 5: Baum-Layout

**Files:**
- Create: `apps/mindvault/src/layout-tree.js`
- Test: `apps/mindvault/test/layout-tree.test.js`

**Interfaces:**
- Consumes: `nodes: Array<{id, incoming}>`, `edges` (aus Task 2)
- Produces: `layoutTree(nodes, edges, options?) -> { [id]: {x, y} }`

- [ ] **Step 1: Fehlschlagende Tests schreiben**

```javascript
// test/layout-tree.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutTree } from '../src/layout-tree.js';

test('Wurzel ist der Knoten mit den meisten eingehenden Links, Kinder liegen eine Ebene tiefer', () => {
  const nodes = [
    { id: 'root', incoming: 2 },
    { id: 'child', incoming: 1 },
    { id: 'lonely', incoming: 0 },
  ];
  const edges = [{ source: 'root', target: 'child' }];
  const positions = layoutTree(nodes, edges, { width: 400, levelHeight: 100 });
  assert.equal(positions.root.y, 40);
  assert.equal(positions.child.y, 140);
});

test('unverlinkter Knoten landet auf Ebene 0, verursacht aber keinen Fehler', () => {
  const nodes = [{ id: 'root', incoming: 1 }, { id: 'lonely', incoming: 0 }];
  const positions = layoutTree(nodes, [], { width: 400 });
  assert.equal(positions.lonely.y, 40);
});

test('leerer Knoten-Satz liefert leeres Ergebnis ohne Fehler', () => {
  assert.deepEqual(layoutTree([], []), {});
});

test('zirkuläre Kanten terminieren die Breitensuche', () => {
  const nodes = [{ id: 'a', incoming: 1 }, { id: 'b', incoming: 1 }];
  const edges = [{ source: 'a', target: 'b' }, { source: 'b', target: 'a' }];
  const start = Date.now();
  layoutTree(nodes, edges);
  assert.ok(Date.now() - start < 1000);
});
```

- [ ] **Step 2: Tests ausführen, Fehlschlag bestätigen**

Run: `node --test test/layout-tree.test.js`
Expected: FAIL mit "Cannot find module '../src/layout-tree.js'"

- [ ] **Step 3: Implementierung schreiben**

```javascript
// src/layout-tree.js
export function layoutTree(nodes, edges, options = {}) {
  if (nodes.length === 0) return {};

  const width = options.width ?? 800;
  const levelHeight = options.levelHeight ?? 100;

  const adjacency = new Map(nodes.map(n => [n.id, []]));
  for (const e of edges) {
    adjacency.get(e.source)?.push(e.target);
    adjacency.get(e.target)?.push(e.source);
  }

  const root = nodes.reduce((best, n) => (n.incoming ?? 0) > (best.incoming ?? 0) ? n : best, nodes[0]);

  const depth = new Map([[root.id, 0]]);
  const queue = [root.id];
  while (queue.length) {
    const current = queue.shift();
    for (const neighbor of adjacency.get(current) ?? []) {
      if (!depth.has(neighbor)) {
        depth.set(neighbor, depth.get(current) + 1);
        queue.push(neighbor);
      }
    }
  }

  const byLevel = new Map();
  for (const n of nodes) {
    if (!depth.has(n.id)) depth.set(n.id, 0);
    const d = depth.get(n.id);
    if (!byLevel.has(d)) byLevel.set(d, []);
    byLevel.get(d).push(n.id);
  }

  const positions = {};
  for (const [level, ids] of byLevel) {
    ids.forEach((id, i) => {
      positions[id] = {
        x: ((i + 1) / (ids.length + 1)) * width,
        y: level * levelHeight + 40,
      };
    });
  }
  return positions;
}
```

- [ ] **Step 4: Tests ausführen, Erfolg bestätigen**

Run: `node --test test/layout-tree.test.js`
Expected: alle 4 Tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/layout-tree.js test/layout-tree.test.js
git commit -m "feat: Baum-Layout ausgehend vom am stärksten verlinkten Knoten"
```

---

## Task 6: 3D-Kugel-Layout

**Files:**
- Create: `apps/mindvault/src/layout-sphere.js`
- Test: `apps/mindvault/test/layout-sphere.test.js`

**Interfaces:**
- Consumes: `nodes: Array<{id}>` (aus Task 2)
- Produces: `layoutSphere(nodes, options?) -> { [id]: {x3, y3, z3, x, y, scale} }`
  (`x3/y3/z3` = Position auf der Kugel vor Rotation/Projektion, `x/y` =
  auf 2D projizierte Canvas-Koordinaten, `scale` = Perspektiv-Faktor für
  Knotengröße/Deckkraft im Renderer aus Task 11)

- [ ] **Step 1: Fehlschlagende Tests schreiben**

```javascript
// test/layout-sphere.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutSphere } from '../src/layout-sphere.js';

test('einzelner Knoten liegt zentriert', () => {
  const result = layoutSphere([{ id: 'only' }]);
  assert.equal(result.only.x, 0);
  assert.equal(result.only.y, 0);
});

test('alle Knoten liegen exakt auf dem angegebenen Kugelradius', () => {
  const nodes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
  const positions = layoutSphere(nodes, { radius: 100 });
  for (const id of ['a', 'b', 'c', 'd']) {
    const p = positions[id];
    const dist = Math.sqrt(p.x3 ** 2 + p.y3 ** 2 + p.z3 ** 2);
    assert.ok(Math.abs(dist - 100) < 0.001);
  }
});

test('Rotation verändert die projizierte x-Koordinate', () => {
  const nodes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const p0 = layoutSphere(nodes, { radius: 100, rotationY: 0 });
  const p1 = layoutSphere(nodes, { radius: 100, rotationY: Math.PI / 2 });
  assert.notEqual(p0.a.x, p1.a.x);
});

test('leerer Knoten-Satz liefert leeres Ergebnis ohne Fehler', () => {
  assert.deepEqual(layoutSphere([]), {});
});
```

- [ ] **Step 2: Tests ausführen, Fehlschlag bestätigen**

Run: `node --test test/layout-sphere.test.js`
Expected: FAIL mit "Cannot find module '../src/layout-sphere.js'"

- [ ] **Step 3: Implementierung schreiben**

```javascript
// src/layout-sphere.js
export function layoutSphere(nodes, options = {}) {
  if (nodes.length === 0) return {};

  const radius = options.radius ?? 200;
  const rotationY = options.rotationY ?? 0;
  const count = nodes.length;
  const positions = {};

  nodes.forEach((n, i) => {
    if (count === 1) {
      positions[n.id] = { x3: 0, y3: 0, z3: radius, x: 0, y: 0, scale: 1 };
      return;
    }
    const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
    const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    const cosR = Math.cos(rotationY), sinR = Math.sin(rotationY);
    const xr = x * cosR + z * sinR;
    const zr = z * cosR - x * sinR;

    const perspective = 600 / (600 + zr);
    positions[n.id] = {
      x3: xr, y3: y, z3: zr,
      x: xr * perspective,
      y: y * perspective,
      scale: perspective,
    };
  });
  return positions;
}
```

- [ ] **Step 4: Tests ausführen, Erfolg bestätigen**

Run: `node --test test/layout-sphere.test.js`
Expected: alle 4 Tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/layout-sphere.js test/layout-sphere.test.js
git commit -m "feat: 3D-Kugel-Layout mit Fibonacci-Verteilung und Rotation"
```

---

## Task 7: Matrix-Layout

**Files:**
- Create: `apps/mindvault/src/layout-matrix.js`
- Test: `apps/mindvault/test/layout-matrix.test.js`

**Interfaces:**
- Consumes: `nodes: Array<{id, tags}>`, `edges` (aus Task 2)
- Produces: `layoutMatrixOrder(nodes) -> string[]` (sortierte Datei-IDs)
- Produces: `buildAdjacencyMatrix(orderedIds, edges) -> boolean[][]`

- [ ] **Step 1: Fehlschlagende Tests schreiben**

```javascript
// test/layout-matrix.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutMatrixOrder, buildAdjacencyMatrix } from '../src/layout-matrix.js';

test('sortiert zuerst nach erstem Tag, dann alphabetisch nach ID', () => {
  const nodes = [
    { id: 'zeta', tags: ['a'] },
    { id: 'alpha', tags: ['a'] },
    { id: 'beta', tags: ['b'] },
  ];
  assert.deepEqual(layoutMatrixOrder(nodes), ['alpha', 'zeta', 'beta']);
});

test('Knoten ohne Tags werden ans Ende der eigenen Gruppe sortiert, ohne Fehler', () => {
  const nodes = [{ id: 'b', tags: [] }, { id: 'a', tags: [] }];
  assert.deepEqual(layoutMatrixOrder(nodes), ['a', 'b']);
});

test('buildAdjacencyMatrix ist symmetrisch und respektiert die Reihenfolge', () => {
  const order = ['a', 'b', 'c'];
  const matrix = buildAdjacencyMatrix(order, [{ source: 'a', target: 'c' }]);
  assert.equal(matrix[0][2], true);
  assert.equal(matrix[2][0], true);
  assert.equal(matrix[0][1], false);
});

test('buildAdjacencyMatrix ignoriert Kanten zu nicht vorhandenen IDs', () => {
  const matrix = buildAdjacencyMatrix(['a'], [{ source: 'a', target: 'unbekannt' }]);
  assert.deepEqual(matrix, [[false]]);
});
```

- [ ] **Step 2: Tests ausführen, Fehlschlag bestätigen**

Run: `node --test test/layout-matrix.test.js`
Expected: FAIL mit "Cannot find module '../src/layout-matrix.js'"

- [ ] **Step 3: Implementierung schreiben**

```javascript
// src/layout-matrix.js
export function layoutMatrixOrder(nodes) {
  return [...nodes]
    .sort((a, b) => {
      const tagA = (a.tags?.[0] ?? '').toLowerCase();
      const tagB = (b.tags?.[0] ?? '').toLowerCase();
      if (tagA !== tagB) return tagA.localeCompare(tagB);
      return a.id.localeCompare(b.id);
    })
    .map(n => n.id);
}

export function buildAdjacencyMatrix(orderedIds, edges) {
  const index = new Map(orderedIds.map((id, i) => [id, i]));
  const size = orderedIds.length;
  const matrix = Array.from({ length: size }, () => new Array(size).fill(false));
  for (const e of edges) {
    const i = index.get(e.source), j = index.get(e.target);
    if (i === undefined || j === undefined) continue;
    matrix[i][j] = true;
    matrix[j][i] = true;
  }
  return matrix;
}
```

- [ ] **Step 4: Tests ausführen, Erfolg bestätigen**

Run: `node --test test/layout-matrix.test.js`
Expected: alle 4 Tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/layout-matrix.js test/layout-matrix.test.js
git commit -m "feat: Matrix-Layout mit tag-basierter Sortierung"
```

---

## Task 8: Zeitleiste/Verlauf

**Files:**
- Create: `apps/mindvault/src/timeline.js`
- Test: `apps/mindvault/test/timeline.test.js`

**Interfaces:**
- Consumes: Inhalt von `log/INDEX.md` als Rohtext
- Produces: `buildTimelineEvents(logIndexContent: string) -> Array<{date, text}>` (aufsteigend nach Datum sortiert)

- [ ] **Step 1: Fehlschlagende Tests schreiben**

```javascript
// test/timeline.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTimelineEvents } from '../src/timeline.js';

test('extrahiert Datum und Text pro Zeile, aufsteigend sortiert', () => {
  const content = '- 2026-02-01 — Zweites Ereignis\n- 2026-01-01 — Erstes Ereignis';
  const events = buildTimelineEvents(content);
  assert.equal(events.length, 2);
  assert.equal(events[0].date, '2026-01-01');
  assert.match(events[0].text, /Erstes Ereignis/);
});

test('Zeilen ohne gültiges Datum werden übersprungen, kein Fehler', () => {
  const content = '- kein Datum hier\n- 2026-01-01 — gültig';
  const events = buildTimelineEvents(content);
  assert.equal(events.length, 1);
});

test('leerer Inhalt liefert leeres Array', () => {
  assert.deepEqual(buildTimelineEvents(''), []);
});
```

- [ ] **Step 2: Tests ausführen, Fehlschlag bestätigen**

Run: `node --test test/timeline.test.js`
Expected: FAIL mit "Cannot find module '../src/timeline.js'"

- [ ] **Step 3: Implementierung schreiben**

```javascript
// src/timeline.js
export function buildTimelineEvents(logIndexContent) {
  const lines = logIndexContent.split('\n');
  const events = [];
  for (const line of lines) {
    const match = line.match(/(\d{4}-\d{2}-\d{2})/);
    if (!match) continue;
    events.push({ date: match[1], text: line.replace(/^[-*]\s*/, '').trim() });
  }
  events.sort((a, b) => a.date.localeCompare(b.date));
  return events;
}
```

- [ ] **Step 4: Tests ausführen, Erfolg bestätigen**

Run: `node --test test/timeline.test.js`
Expected: alle 3 Tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/timeline.js test/timeline.test.js
git commit -m "feat: Zeitleiste aus log/INDEX.md ableiten"
```

---

## Task 9: HTML-Shell, Datei-Lader und Build-Skript

**Files:**
- Create: `apps/mindvault/viewer/shell.html`
- Create: `apps/mindvault/viewer/loader.js`
- Create: `apps/mindvault/viewer/build.js`
- Modify: `apps/mindvault/package.json` (Build-Skript bereits in Task 1 referenziert)

**Interfaces:**
- Produces: `loadVaultViaPicker() -> Promise<Map<string,string>>`
- Produces: `loadVaultViaDragDrop(fileList: FileList) -> Promise<Map<string,string>>`
- Produces: `supportsFileSystemAccess() -> boolean`
- Produces (Build): `viewer/graph-viewer.html`, zusammengesetzt aus `shell.html`
  + allen `src/*.js`-Modulen + `loader.js` (spätere Tasks fügen `render.js`
  hinzu, siehe Task 10).

- [ ] **Step 1: HTML-Gerüst schreiben**

```html
<!-- viewer/shell.html -->
<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>Vault Graph Viewer</title>
<style>
  body { margin: 0; font-family: system-ui, sans-serif; background: #1e1e1e; color: #eee; }
  #toolbar { display: flex; gap: 8px; padding: 8px; background: #2a2a2a; flex-wrap: wrap; align-items: center; }
  #toolbar button, #toolbar input { font: inherit; padding: 4px 8px; }
  #canvas-wrap { position: relative; }
  canvas { display: block; background: #1e1e1e; }
  #tag-filters { display: flex; gap: 4px; flex-wrap: wrap; }
  #search-results { position: absolute; top: 48px; left: 8px; background: #2a2a2a; max-height: 300px; overflow: auto; padding: 8px; display: none; }
</style>
</head>
<body>
  <div id="toolbar">
    <button id="open-folder">Vault-Ordner öffnen</button>
    <input type="file" id="drag-fallback" webkitdirectory style="display:none">
    <button data-view="2d">Obsidian-2D</button>
    <button data-view="tree">Baum</button>
    <button data-view="sphere">3D-Kugel</button>
    <button data-view="matrix">Matrix</button>
    <input type="text" id="search" placeholder="Suche...">
    <label><input type="checkbox" id="hide-orphans"> Verwaiste ausblenden</label>
    <div id="tag-filters"></div>
    <button id="export-png">Export PNG</button>
  </div>
  <div id="canvas-wrap">
    <canvas id="graph-canvas" width="1000" height="700"></canvas>
    <div id="search-results"></div>
  </div>
  <script>
/*__INLINE_SCRIPTS__*/
  </script>
</body>
</html>
```

- [ ] **Step 2: Datei-Lader schreiben**

```javascript
// viewer/loader.js
function supportsFileSystemAccess() {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
}

async function collectMarkdownFiles(dirHandle, prefix = '') {
  const files = new Map();
  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind === 'directory') {
      const nested = await collectMarkdownFiles(handle, prefix + name + '/');
      for (const [k, v] of nested) files.set(k, v);
    } else if (name.toLowerCase().endsWith('.md')) {
      const file = await handle.getFile();
      files.set(prefix + name, await file.text());
    }
  }
  return files;
}

async function loadVaultViaPicker() {
  const dirHandle = await window.showDirectoryPicker();
  return collectMarkdownFiles(dirHandle);
}

async function loadVaultViaDragDrop(fileList) {
  const files = new Map();
  const mdFiles = [...fileList].filter(f => f.name.toLowerCase().endsWith('.md'));
  for (const f of mdFiles) {
    files.set(f.webkitRelativePath || f.name, await f.text());
  }
  return files;
}
```

- [ ] **Step 3: Build-Skript schreiben**

```javascript
// viewer/build.js
import { readFileSync, writeFileSync } from 'node:fs';

const modules = [
  '../src/parser.js',
  '../src/layout-2d.js',
  '../src/layout-tree.js',
  '../src/layout-sphere.js',
  '../src/layout-matrix.js',
  '../src/filters.js',
  '../src/timeline.js',
  './loader.js',
];

const combined = modules
  .map(path => readFileSync(new URL(path, import.meta.url), 'utf8'))
  .join('\n')
  .replace(/^export /gm, '');

const shell = readFileSync(new URL('./shell.html', import.meta.url), 'utf8');
const output = shell.replace('/*__INLINE_SCRIPTS__*/', combined);
writeFileSync(new URL('./graph-viewer.html', import.meta.url), output);
console.log('graph-viewer.html gebaut (' + combined.length + ' Zeichen Skript).');
```

- [ ] **Step 4: Build ausführen und manuell im Browser prüfen**

Run: `cd apps/mindvault && node viewer/build.js`
Expected: Konsolenausgabe "graph-viewer.html gebaut (...)", Datei
`viewer/graph-viewer.html` existiert.

Manuelle Prüfung: `viewer/graph-viewer.html` im Browser öffnen (Doppelklick
oder `file://`-Pfad). Erwartet: Werkzeugleiste mit Buttons ist sichtbar,
Browser-Konsole zeigt keine Fehler (die Lade-Funktionen sind noch nicht
verdrahtet — das folgt in Task 10).

- [ ] **Step 5: Commit**

```bash
git add viewer/shell.html viewer/loader.js viewer/build.js viewer/graph-viewer.html
git commit -m "feat: HTML-Shell, Datei-Lader und Build-Skript für den Viewer"
```

---

## Task 10: Obsidian-2D-Renderer (Hover, Klick, Zoom/Pan, lokaler Graph)

**Files:**
- Create: `apps/mindvault/viewer/render.js`
- Modify: `apps/mindvault/viewer/build.js:7` (`render.js` in `modules`-Liste ergänzen)

**Interfaces:**
- Consumes: `buildGraph`, `layoutForceDirected`, `applyFilters` (aus
  Task 2–4), `loadVaultViaPicker`/`loadVaultViaDragDrop` (aus Task 9)
- Produces: `renderObsidian2D(ctx, graph, positions, options) -> void`
  (zeichnet Knoten/Kanten; Knotengröße nach `incoming`, Farbe nach
  erstem Tag)
- Produces: `initViewer()` — verdrahtet Toolbar-Buttons, hält globalen
  Zustand (`currentFiles`, `currentGraph`, `activeView`, `filters`,
  `selectedNodeId` für den lokalen Graph), zeichnet bei jeder Änderung neu.

- [ ] **Step 1: `render.js` mit Renderer, Interaktion und Verdrahtung schreiben**

```javascript
// viewer/render.js
const TAG_COLORS = ['#e06c75', '#61afef', '#98c379', '#e5c07b', '#c678dd', '#56b6c2'];

function colorForTag(tag) {
  if (!tag) return '#888';
  let hash = 0;
  for (const ch of tag) hash = (hash * 31 + ch.charCodeAt(0)) % TAG_COLORS.length;
  return TAG_COLORS[hash];
}

function renderObsidian2D(ctx, graph, positions, options = {}) {
  const { hoveredId = null, selectedId = null } = options;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.strokeStyle = '#555';
  for (const e of graph.edges) {
    const s = positions[e.source], t = positions[e.target];
    if (!s || !t) continue;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(t.x, t.y);
    ctx.stroke();
  }

  for (const n of graph.nodes) {
    const p = positions[n.id];
    if (!p) continue;
    const radius = 6 + Math.min(n.incoming, 10) * 1.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = colorForTag(n.tags?.[0]);
    if (n.id === hoveredId || n.id === selectedId) {
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 12;
    } else {
      ctx.shadowBlur = 0;
    }
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ddd';
    ctx.font = '11px system-ui';
    ctx.fillText(n.id, p.x + radius + 2, p.y + 3);
  }
}

function findNodeAt(positions, x, y, radius = 10) {
  for (const [id, p] of Object.entries(positions)) {
    if (Math.hypot(p.x - x, p.y - y) <= radius) return id;
  }
  return null;
}

function localGraph(graph, selectedId, depth) {
  if (!selectedId) return graph;
  const keep = new Set([selectedId]);
  let frontier = [selectedId];
  for (let d = 0; d < depth; d++) {
    const next = [];
    for (const e of graph.edges) {
      if (frontier.includes(e.source) && !keep.has(e.target)) { keep.add(e.target); next.push(e.target); }
      if (frontier.includes(e.target) && !keep.has(e.source)) { keep.add(e.source); next.push(e.source); }
    }
    frontier = next;
  }
  return {
    nodes: graph.nodes.filter(n => keep.has(n.id)),
    edges: graph.edges.filter(e => keep.has(e.source) && keep.has(e.target)),
  };
}

function initViewer() {
  const canvas = document.getElementById('graph-canvas');
  const ctx = canvas.getContext('2d');

  let currentFiles = new Map();
  let currentGraph = { nodes: [], edges: [] };
  let activeView = '2d';
  let filters = { activeTags: null, hideOrphans: false, query: '' };
  let selectedNodeId = null;
  let localDepth = 1;
  let hoveredId = null;
  let positions = {};

  function recomputeAndDraw() {
    const filtered = selectedNodeId
      ? localGraph(applyFilters(currentGraph, filters), selectedNodeId, localDepth)
      : applyFilters(currentGraph, filters);

    if (activeView === '2d') {
      positions = layoutForceDirected(filtered.nodes, filtered.edges, { width: canvas.width, height: canvas.height, iterations: 150 });
      renderObsidian2D(ctx, filtered, positions, { hoveredId, selectedId: selectedNodeId });
    }
    // Baum/3D-Kugel/Matrix-Zweige werden in Task 11 ergänzt.
  }

  async function loadFiles(files) {
    currentFiles = files;
    currentGraph = buildGraph(files);
    recomputeAndDraw();
  }

  document.getElementById('open-folder').addEventListener('click', async () => {
    if (supportsFileSystemAccess()) {
      loadFiles(await loadVaultViaPicker());
    } else {
      document.getElementById('drag-fallback').click();
    }
  });

  document.getElementById('drag-fallback').addEventListener('change', async (e) => {
    loadFiles(await loadVaultViaDragDrop(e.target.files));
  });

  document.getElementById('search').addEventListener('input', (e) => {
    filters = { ...filters, query: e.target.value };
    recomputeAndDraw();
  });

  document.getElementById('hide-orphans').addEventListener('change', (e) => {
    filters = { ...filters, hideOrphans: e.target.checked };
    recomputeAndDraw();
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    hoveredId = findNodeAt(positions, e.clientX - rect.left, e.clientY - rect.top);
    recomputeAndDraw();
  });

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const id = findNodeAt(positions, e.clientX - rect.left, e.clientY - rect.top);
    selectedNodeId = id;
    recomputeAndDraw();
  });

  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => { activeView = btn.dataset.view; recomputeAndDraw(); });
  });
}

window.addEventListener('DOMContentLoaded', initViewer);
```

- [ ] **Step 2: `render.js` in Build-Reihenfolge einhängen**

```javascript
// viewer/build.js — Zeile 7, in der modules-Liste, nach '../src/timeline.js':
  '../src/timeline.js',
  './loader.js',
  './render.js',
```

- [ ] **Step 3: Build ausführen**

Run: `node viewer/build.js`
Expected: "graph-viewer.html gebaut (...)" ohne Fehler.

- [ ] **Step 4: Manuelle Prüfung im Browser**

`viewer/graph-viewer.html` öffnen, "Vault-Ordner öffnen" klicken, den
`vault-template/`-Ordner auswählen. Erwartet: Knoten erscheinen auf dem
Canvas, Hover hebt einen Knoten hervor, Klick auf einen Knoten zeigt nur
noch dessen lokale Umgebung (Tiefe 1). Klick auf eine leere Fläche (kein
Knoten unter dem Mauszeiger) setzt die Auswahl zurück — `findNodeAt`
liefert dort `null`, wodurch `selectedNodeId` in Step 1 bereits korrekt
auf `null` gesetzt wird; das ist kein separater Zusatz, sondern Verhalten
des bestehenden Click-Handlers.

- [ ] **Step 5: Commit**

```bash
git add viewer/render.js viewer/build.js viewer/graph-viewer.html
git commit -m "feat: Obsidian-2D-Renderer mit Hover, Klick und lokalem Graph"
```

---

## Task 11: Baum-, 3D-Kugel-, Matrix-Renderer und Ansichts-Umschalter

**Files:**
- Modify: `apps/mindvault/viewer/render.js` (Funktionen `renderTree`,
  `renderSphere`, `renderMatrix` ergänzen, `recomputeAndDraw` um die drei
  neuen Zweige erweitern)

**Interfaces:**
- Consumes: `layoutTree`, `layoutSphere`, `layoutMatrixOrder`,
  `buildAdjacencyMatrix` (aus Task 5–7)
- Produces: `renderTree(ctx, graph, positions) -> void`,
  `renderSphere(ctx, graph, positions) -> void`,
  `renderMatrix(ctx, orderedIds, matrix) -> void`

- [ ] **Step 1: Drei Renderer-Funktionen ergänzen**

```javascript
// viewer/render.js — nach renderObsidian2D ergänzen:

function renderTree(ctx, graph, positions) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.strokeStyle = '#555';
  for (const e of graph.edges) {
    const s = positions[e.source], t = positions[e.target];
    if (!s || !t) continue;
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(t.x, t.y); ctx.stroke();
  }
  for (const n of graph.nodes) {
    const p = positions[n.id];
    if (!p) continue;
    ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = colorForTag(n.tags?.[0]); ctx.fill();
    ctx.fillStyle = '#ddd'; ctx.font = '11px system-ui';
    ctx.fillText(n.id, p.x + 10, p.y + 3);
  }
}

function renderSphere(ctx, graph, positions) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const cx = ctx.canvas.width / 2, cy = ctx.canvas.height / 2;
  const sorted = [...graph.nodes].sort((a, b) => (positions[a.id]?.z3 ?? 0) - (positions[b.id]?.z3 ?? 0));
  for (const n of sorted) {
    const p = positions[n.id];
    if (!p) continue;
    const radius = 6 * p.scale;
    ctx.beginPath();
    ctx.arc(cx + p.x, cy + p.y, Math.max(radius, 1), 0, Math.PI * 2);
    ctx.fillStyle = colorForTag(n.tags?.[0]);
    ctx.globalAlpha = Math.max(0.3, Math.min(1, p.scale));
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function renderMatrix(ctx, orderedIds, matrix) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const size = orderedIds.length;
  const cell = Math.max(4, Math.min(20, Math.floor(600 / Math.max(size, 1))));
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      if (!matrix[i][j]) continue;
      ctx.fillStyle = '#61afef';
      ctx.fillRect(40 + j * cell, 40 + i * cell, cell - 1, cell - 1);
    }
  }
  ctx.fillStyle = '#ddd'; ctx.font = '10px system-ui';
  orderedIds.forEach((id, i) => ctx.fillText(id.slice(0, 5), 2, 40 + i * cell + cell / 1.5));
}
```

- [ ] **Step 2: `recomputeAndDraw` um die drei Ansichten erweitern**

```javascript
// viewer/render.js — recomputeAndDraw ersetzen durch:
  function recomputeAndDraw() {
    const filtered = selectedNodeId
      ? localGraph(applyFilters(currentGraph, filters), selectedNodeId, localDepth)
      : applyFilters(currentGraph, filters);

    if (activeView === '2d') {
      positions = layoutForceDirected(filtered.nodes, filtered.edges, { width: canvas.width, height: canvas.height, iterations: 150 });
      renderObsidian2D(ctx, filtered, positions, { hoveredId, selectedId: selectedNodeId });
    } else if (activeView === 'tree') {
      positions = layoutTree(filtered.nodes, filtered.edges, { width: canvas.width, levelHeight: 90 });
      renderTree(ctx, filtered, positions);
    } else if (activeView === 'sphere') {
      positions = layoutSphere(filtered.nodes, { radius: 200, rotationY: Date.now() / 4000 });
      renderSphere(ctx, filtered, positions);
    } else if (activeView === 'matrix') {
      const orderedIds = layoutMatrixOrder(filtered.nodes);
      const matrix = buildAdjacencyMatrix(orderedIds, filtered.edges);
      renderMatrix(ctx, orderedIds, matrix);
    }
  }
```

- [ ] **Step 3: Build ausführen**

Run: `node viewer/build.js`
Expected: kein Fehler.

- [ ] **Step 4: Manuelle Prüfung im Browser**

`viewer/graph-viewer.html` öffnen, Vault laden, nacheinander alle vier
Buttons (Obsidian-2D/Baum/3D-Kugel/Matrix) klicken. Erwartet: jede
Ansicht zeichnet etwas sichtbar Unterschiedliches, keine Fehler in der
Konsole, Wechsel zwischen Ansichten funktioniert ohne Neuladen der Seite.

- [ ] **Step 5: Commit**

```bash
git add viewer/render.js viewer/graph-viewer.html
git commit -m "feat: Baum-, 3D-Kugel- und Matrix-Ansicht plus Umschalter"
```

---

## Task 12: Export/Snapshot (PNG)

**Files:**
- Modify: `apps/mindvault/viewer/render.js` (Export-Handler ergänzen)

**Interfaces:**
- Produces: Klick-Handler auf `#export-png`, der `canvas.toDataURL('image/png')`
  nutzt und einen Download auslöst.

- [ ] **Step 1: Export-Handler in `initViewer()` ergänzen**

```javascript
// viewer/render.js — in initViewer(), nach den anderen addEventListener-Aufrufen:
  document.getElementById('export-png').addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = `graph-${activeView}-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  });
```

- [ ] **Step 2: Build ausführen**

Run: `node viewer/build.js`
Expected: kein Fehler.

- [ ] **Step 3: Manuelle Prüfung im Browser**

Vault laden, auf "Export PNG" klicken. Erwartet: Browser löst einen
Download einer `.png`-Datei aus, die geöffnet den aktuell sichtbaren
Graphen zeigt.

- [ ] **Step 4: Commit**

```bash
git add viewer/render.js viewer/graph-viewer.html
git commit -m "feat: Graph als PNG exportieren"
```

---

## Task 13: Tag-Filter-UI, Volltextsuche-Ergebnisliste, Zeitleiste

**Files:**
- Modify: `apps/mindvault/viewer/render.js` (Tag-Checkboxen generieren,
  Suchergebnis-Panel befüllen, Zeitleiste-Steuerung ergänzen)
- Modify: `apps/mindvault/viewer/shell.html:21` (Zeitleiste-Steuerelement
  ergänzen, falls in Task 9 noch nicht vorhanden)

**Interfaces:**
- Consumes: `searchFullText`, `buildTimelineEvents` (aus Task 4, 8)

- [ ] **Step 1: Zeitleiste-Steuerelement im Shell ergänzen**

```html
<!-- viewer/shell.html — Zeile 21, nach dem Export-Button -->
    <button id="export-png">Export PNG</button>
    <input type="range" id="timeline-slider" min="0" max="0" value="0">
    <span id="timeline-label"></span>
```

- [ ] **Step 2: Tag-Checkboxen, Suchergebnisse und Zeitleiste in `initViewer()` verdrahten**

```javascript
// viewer/render.js — in initViewer(), loadFiles erweitern und neue Funktionen ergänzen:

  function renderTagFilters() {
    const container = document.getElementById('tag-filters');
    const allTags = [...new Set(currentGraph.nodes.flatMap(n => n.tags))].sort();
    container.innerHTML = '';
    for (const tag of allTags) {
      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.addEventListener('change', () => {
        const checked = [...container.querySelectorAll('input:checked')].map(c => c.dataset.tag);
        filters = { ...filters, activeTags: checked.length ? checked : null };
        recomputeAndDraw();
      });
      checkbox.dataset.tag = tag;
      label.append(checkbox, document.createTextNode('#' + tag));
      container.append(label);
    }
  }

  function renderSearchResults(query) {
    const panel = document.getElementById('search-results');
    if (!query) { panel.style.display = 'none'; return; }
    const matches = searchFullText(currentFiles, query);
    panel.innerHTML = matches.map(m => `<div><strong>${m.filename}</strong>: …${m.excerpt}…</div>`).join('');
    panel.style.display = matches.length ? 'block' : 'none';
  }

  function setupTimeline() {
    const logContent = currentFiles.get('log/INDEX.md') ?? '';
    const events = buildTimelineEvents(logContent);
    const slider = document.getElementById('timeline-slider');
    slider.max = String(Math.max(events.length - 1, 0));
    slider.oninput = () => {
      const event = events[Number(slider.value)];
      document.getElementById('timeline-label').textContent = event ? `${event.date} — ${event.text}` : '';
    };
    if (events.length) slider.oninput();
  }
```

- [ ] **Step 3: Die neuen Funktionen in `loadFiles` und das Such-Input einhängen**

```javascript
// viewer/render.js — loadFiles ersetzen durch:
  async function loadFiles(files) {
    currentFiles = files;
    currentGraph = buildGraph(files);
    renderTagFilters();
    setupTimeline();
    recomputeAndDraw();
  }

// und das bestehende #search-Input-Listener ergänzen um:
  document.getElementById('search').addEventListener('input', (e) => {
    filters = { ...filters, query: e.target.value };
    renderSearchResults(e.target.value);
    recomputeAndDraw();
  });
```

- [ ] **Step 4: Build ausführen und manuell prüfen**

Run: `node viewer/build.js`
Manuelle Prüfung: Vault laden → Tag-Checkboxen erscheinen passend zu den
im Vault vorkommenden Tags, Ankreuzen filtert den Graphen; Suchbegriff
eingeben → Ergebnis-Panel zeigt Fundstellen mit Dateinamen und Ausschnitt;
Zeitleiste-Schieberegler bewegt sich über die Anzahl der Log-Einträge und
zeigt Datum + Text an.

- [ ] **Step 5: Commit**

```bash
git add viewer/render.js viewer/shell.html viewer/graph-viewer.html
git commit -m "feat: Tag-Filter-UI, Suchergebnis-Panel und Zeitleiste-Steuerung"
```

---

## Task 14: Sima-Design-Styling anwenden

**Files:**
- Modify: `apps/mindvault/viewer/shell.html` (CSS-Variablen + Styles ersetzen)
- Modify: `apps/mindvault/viewer/render.js` (Tag-Farbpalette ersetzen)

**Interfaces:**
- Keine neuen Funktionen — reine Styling-Änderung, Verhalten bleibt
  identisch zu Task 13.
- Ruling (siehe Ledger): UI-Chrome bekommt volles Sima-Design
  (grayscale, Helvetica, Hairline-Borders, flach). Die Tag-Farbcodierung
  im Canvas bleibt bestehen (Kernfunktion aus der PRD), wird aber auf
  eine gedämpfte, der Status-Palette entlehnte Farbreihe umgestellt statt
  kräftiger SaaS-Farben.

- [ ] **Step 1: CSS-Variablen und Styles in `shell.html` durch Sima-Design-Werte ersetzen**

```html
<!-- viewer/shell.html — den bestehenden <style>-Block ersetzen durch: -->
<style>
  :root {
    --ink: #0A0A0A;
    --paper: #FFFFFF;
    --gray-50: #F9FAFB;
    --gray-100: #F3F4F6;
    --gray-200: #E5E7EB;
    --gray-300: #D1D5DB;
    --gray-400: #9CA3AF;
    --gray-500: #6B7280;
    --gray-700: #374151;
    --gray-900: #111827;
    --font-sans: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  }
  body {
    margin: 0;
    font-family: var(--font-sans);
    font-size: 14px;
    line-height: 1.6;
    color: var(--gray-700);
    background: var(--paper);
  }
  #toolbar {
    display: flex;
    gap: 8px;
    padding: 12px 16px;
    background: #FAFAFA;
    border-bottom: 1px solid var(--gray-200);
    flex-wrap: wrap;
    align-items: center;
  }
  #toolbar button {
    font: inherit;
    font-size: 13px;
    padding: 8px 16px;
    border-radius: 4px;
    border: 1px solid var(--gray-200);
    background: var(--paper);
    color: var(--gray-700);
    cursor: pointer;
    transition: background 180ms ease, border-color 180ms ease;
  }
  #toolbar button:hover {
    background: var(--gray-50);
    border-color: var(--gray-300);
  }
  #toolbar input[type="text"] {
    font: inherit;
    font-size: 13px;
    padding: 8px 10px;
    border-radius: 4px;
    border: 1px solid var(--gray-200);
    color: var(--gray-700);
  }
  #toolbar input[type="text"]:focus {
    outline: none;
    border-color: var(--gray-400);
  }
  #toolbar label {
    font-size: 13px;
    color: var(--gray-500);
    display: flex;
    align-items: center;
    gap: 4px;
  }
  #canvas-wrap { position: relative; }
  canvas { display: block; background: var(--paper); }
  #tag-filters { display: flex; gap: 4px; flex-wrap: wrap; }
  #search-results {
    position: absolute;
    top: 48px;
    left: 8px;
    background: var(--paper);
    border: 1px solid var(--gray-200);
    border-radius: 8px;
    max-height: 300px;
    overflow: auto;
    padding: 12px;
    font-size: 13px;
    color: var(--gray-700);
    display: none;
  }
</style>
```

- [ ] **Step 2: Canvas-Hintergrund und Textfarbe in `render.js` an das helle Sima-Design anpassen**

```javascript
// viewer/render.js — in renderObsidian2D, renderTree, renderSphere, renderMatrix:
// jedes ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height) durch einen
// expliziten weißen Hintergrund-Fill ersetzen (behebt zugleich den
// transparenten PNG-Export aus Task 12s Review-Befund):
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

// und jedes Vorkommen von ctx.fillStyle = '#ddd' (Knoten-/Zellen-Beschriftung
// in renderObsidian2D, renderTree, renderMatrix) ersetzen durch:
  ctx.fillStyle = '#374151';
```

- [ ] **Step 3: Gedämpfte Tag-Farbpalette statt kräftiger SaaS-Farben**

```javascript
// viewer/render.js — TAG_COLORS ersetzen durch eine gedämpfte,
// der Status-Palette entlehnte Reihe (bewusst keine kräftigen
// Vollfarben, passend zu "quieter is correct"):
const TAG_COLORS = ['#6B7280', '#B45309', '#15803D', '#B91C1C', '#2563EB', '#4B5563'];
```

- [ ] **Step 4: Build ausführen und manuell prüfen**

Run: `node viewer/build.js`
Manuelle Prüfung: `viewer/graph-viewer.html` öffnen. Erwartet: helle,
schlichte Werkzeugleiste (keine dunkle SaaS-Optik), Helvetica-Schrift,
dünne graue Trennlinie unter der Werkzeugleiste, Buttons mit Hairline-
Border statt Vollfarbe. Der Graph selbst bleibt auf hellem Hintergrund,
Tag-Farben sind gedämpft statt grell, aber weiterhin pro Tag
unterscheidbar. Export-PNG (Task 12) hat jetzt einen weißen statt
transparenten Hintergrund. Funktionalität (Laden, Filtern, Suchen,
Ansichten wechseln) unverändert gegenüber Task 13.

- [ ] **Step 5: Commit**

```bash
git add viewer/shell.html viewer/render.js viewer/graph-viewer.html
git commit -m "style: Sima-Design auf UI-Chrome anwenden, gedämpfte Tag-Palette"
```

---

## Task 15: Demo-Vault befüllen

**Files:**
- Create: `apps/mindvault/demo-vault/MEMORY.md`
- Create: `apps/mindvault/demo-vault/CLAUDE.md`
- Create: `apps/mindvault/demo-vault/entscheidungen.md`
- Create: `apps/mindvault/demo-vault/log/INDEX.md`
- Create: `apps/mindvault/demo-vault/projekte/webshop-relaunch.md`
- Create: `apps/mindvault/demo-vault/projekte/kundenportal.md`
- Test: `apps/mindvault/test/demo-vault.test.js`

**Interfaces:**
- Produces: einen vollständigen, in sich verlinkten Beispiel-Vault mit
  mehreren Tags, mindestens einer Fälligkeit und mehreren `[[Links]]`,
  damit der Graph-Viewer beim ersten Öffnen sofort etwas Sinnvolles zeigt.

- [ ] **Step 1: Demo-Vault-Inhalte anlegen**

```markdown
<!-- demo-vault/MEMORY.md -->
# Gedächtnis-Index (Demo)

- [Webshop-Relaunch](projekte/webshop-relaunch.md) — Shop-Umbau für einen Beispielkunden #webshop #frontend
- [Kundenportal](projekte/kundenportal.md) — Login-Bereich für Bestandskunden #kundenportal #backend
```

```markdown
<!-- demo-vault/CLAUDE.md -->
(identisch zur Pflegeanleitung aus vault-template/CLAUDE.md — siehe dort)
```

```markdown
<!-- demo-vault/entscheidungen.md -->
# Entscheidungen (Demo)

## 2026-09-15 — Login über bestehenden Auth-Dienst statt Neubau
Warum: Der Kunde hat schon einen Auth-Dienst für das [[projekte/webshop-relaunch]]-Projekt, ein zweiter wäre doppelte Pflege. #kundenportal #backend
```

```markdown
<!-- demo-vault/log/INDEX.md -->
# Sitzungs-Log (Demo)

- 2026-09-20 — Kundenportal-Login an bestehenden Auth-Dienst angebunden, lief gut.
- 2026-09-15 — Entscheidung zu Login-Strategie getroffen, siehe [[entscheidungen]].
- 2026-09-01 — Webshop-Relaunch-Projekt aufgesetzt.
```

```markdown
<!-- demo-vault/projekte/webshop-relaunch.md -->
# Webshop-Relaunch

Stand: 2026-09-20 · #webshop #frontend

## Aktueller Stand

Neues Checkout-Layout steht, Zahlungsanbieter-Anbindung offen.

## Offene Punkte

- Zahlungsanbieter anbinden. Fällig: 2026-10-30

## Verwandte Einträge

- [[projekte/kundenportal]]
```

```markdown
<!-- demo-vault/projekte/kundenportal.md -->
# Kundenportal

Stand: 2026-09-20 · #kundenportal #backend

## Aktueller Stand

Login-Bereich nutzt den bestehenden Auth-Dienst aus dem Webshop-Projekt.

## Offene Punkte

- Passwort-Reset-Flow testen. Fällig: 2026-10-05

## Verwandte Einträge

- [[entscheidungen]]
- [[projekte/webshop-relaunch]]
```

- [ ] **Step 2: Test schreiben, der Vollständigkeit und Verlinkung prüft**

```javascript
// test/demo-vault.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { buildGraph } from '../src/parser.js';

const base = new URL('../demo-vault/', import.meta.url);

function loadDemoVault() {
  const files = new Map();
  const walk = (dir, prefix) => {
    for (const entry of readdirSync(new URL(dir, base), { withFileTypes: true })) {
      if (entry.isDirectory()) walk(dir + entry.name + '/', prefix + entry.name + '/');
      else if (entry.name.endsWith('.md')) {
        files.set(prefix + entry.name, readFileSync(new URL(dir + entry.name, base), 'utf8'));
      }
    }
  };
  walk('', '');
  return files;
}

test('Demo-Vault hat mindestens zwei Projekte mit Tags, einer Fälligkeit und gegenseitigen Links', () => {
  const files = loadDemoVault();
  const { nodes, edges } = buildGraph(files);
  assert.ok(nodes.length >= 5, 'Demo-Vault sollte mehrere Dateien enthalten');
  assert.ok(nodes.some(n => n.tags.length > 0), 'mindestens ein Knoten sollte Tags haben');
  assert.ok(nodes.some(n => n.due !== null), 'mindestens ein Knoten sollte eine Fälligkeit haben');
  assert.ok(edges.length >= 3, 'Demo-Vault sollte mehrfach verlinkt sein');
  assert.ok(!nodes.every(n => n.orphan), 'nicht alle Knoten sollten verwaist sein');
});
```

- [ ] **Step 3: Test ausführen**

Run: `node --test test/demo-vault.test.js`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add demo-vault/ test/demo-vault.test.js
git commit -m "feat: befüllten Demo-Vault für den ersten Eindruck ergänzen"
```

---

## Task 16: README, Plattform-Adapter und Lizenztext

**Files:**
- Create: `apps/mindvault/docs/README.md`
- Create: `apps/mindvault/docs/LICENSE.md`

**Interfaces:**
- Produces: die beiden Dokumente, die dem Käufer als erste Anlaufstelle
  mitgegeben werden (verweist auf `vault-template/`, `demo-vault/`,
  `viewer/graph-viewer.html`).

- [ ] **Step 1: README mit Plattform-Adaptern schreiben**

```markdown
<!-- docs/README.md -->
# mindvault — Dateibasiertes Gedächtnis für jedes LLM

## Schnellstart

1. Kopiere `vault-template/` an einen Ort deiner Wahl, z.B. `mein-gedaechtnis/`.
2. Öffne `viewer/graph-viewer.html` per Doppelklick, um deinen Vault jederzeit visuell zu sehen — läuft offline, ohne Internet, ohne LLM.
3. Schau dir zuerst `demo-vault/` im Viewer an, um zu sehen, wie ein befüllter Vault aussieht.

## Einrichtung je Plattform

**Claude Code:** Lege eine `.claude/settings.json` mit einem
`SessionStart`-Hook an, der den Inhalt von `MEMORY.md` automatisch in den
Kontext lädt. Vorlage liegt in `vault-template/CLAUDE.md`.

**ChatGPT (mit Dateizugriff/Projekte):** Lade `MEMORY.md` und die
relevanten `projekte/*.md`-Dateien als Projektwissen hoch. Füge den
Inhalt von `CLAUDE.md` als Custom Instructions ein.

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

`viewer/graph-viewer.html` ist eine einzelne, abhängigkeitsfreie Datei.
Beim Öffnen wählst du deinen Vault-Ordner aus (Chrome/Edge: direkte
Ordnerauswahl; Firefox/Safari: Ordner per Drag&Drop in das Auswahlfeld
ziehen). Vier Ansichten stehen über die Werkzeugleiste zur Verfügung:
Obsidian-2D, Baum, 3D-Kugel, Matrix. Dazu Suche, Tag-Filter, lokaler Graph
(Klick auf einen Knoten), Zeitleiste und PNG-Export.

## Obsidian-Kompatibilität

Die Verknüpfungs- (`[[Link]]`) und Tag-Syntax (`#tag`) ist identisch zu
Obsidian — du kannst den Vault-Ordner zusätzlich direkt in Obsidian öffnen,
falls du es installiert hast. Ein `.obsidian`-Konfigurationsordner ist
bewusst nicht enthalten, damit nichts mit einem bestehenden Obsidian-Setup
kollidiert.
```

- [ ] **Step 2: Lizenztext schreiben**

```markdown
<!-- docs/LICENSE.md -->
# Nutzungsbedingungen

Mit dem Kauf erhältst du eine persönliche, nicht-exklusive Lizenz zur
Nutzung dieser Vorlage (Vault-Template, Graph-Viewer, Demo-Vault) für
deine eigene Arbeit.

**Nicht erlaubt:**
- Weitergabe, Veröffentlichung oder Weiterverkauf der Vorlage selbst
  (als Ganzes oder in Teilen) an Dritte.
- Anbieten als eigenes Produkt oder als Teil eines anderen Produkts.

**Erlaubt:**
- Beliebige Anpassung für den eigenen Gebrauch.
- Nutzung für beliebig viele eigene Projekte/Vaults.

Diese Vorlage wird ohne Gewährleistung bereitgestellt.
```

- [ ] **Step 3: Commit**

```bash
git add docs/README.md docs/LICENSE.md
git commit -m "docs: README mit Plattform-Adaptern und Lizenztext"
```

---

## Nacharbeit (kein eigener Task mit Code)

Nach Abschluss aller Tasks: Projekt-`CLAUDE.md` für `apps/mindvault/`
über den `kontext-md-graph`-Skill erzeugen (nicht von Hand schreiben,
der Skill kennt das vom Nutzer gewünschte Primer-Format) und in der
Workspace-Landkarte (`C:\Users\juliu\Documents\Claude\CLAUDE.md`,
Abschnitt `apps/`) eine Zeile ergänzen.
