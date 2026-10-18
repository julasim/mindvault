function parseMarkdown(content) {
  const tags = [...content.matchAll(/#([a-zA-ZäöüÄÖÜß0-9_-]+)/g)].map(m => m[1]);
  const links = [...content.matchAll(/\[\[([^\]]+)\]\]/g)].map(m => m[1].trim());
  const dueMatch = content.match(/Fällig:\s*(\d{4}-\d{2}-\d{2})/);
  return {
    tags: [...new Set(tags)],
    links: [...new Set(links)],
    due: dueMatch ? dueMatch[1] : null,
  };
}

function buildGraph(files) {
  const idByLowerName = new Map();
  for (const filename of files.keys()) {
    const id = filename.replace(/\.md$/i, '');
    idByLowerName.set(id.toLowerCase(), id);
  }

  // Zweite Lookup-Tabelle für Obsidian-Stil-Auflösung nach bloßem
  // Dateinamen (letztes Pfadsegment), nur wenn eindeutig — mehrdeutige
  // Namen (zwei Dateien gleichen Namens in unterschiedlichen Ordnern)
  // werden bewusst nicht aufgelöst, um kein falsches Ziel zu raten.
  const idsByBareName = new Map();
  for (const id of idByLowerName.values()) {
    const bareName = id.split('/').pop().toLowerCase();
    if (!idsByBareName.has(bareName)) idsByBareName.set(bareName, []);
    idsByBareName.get(bareName).push(id);
  }
  const idByBareNameUnambiguous = new Map();
  for (const [bareName, ids] of idsByBareName) {
    if (ids.length === 1) idByBareNameUnambiguous.set(bareName, ids[0]);
  }

  const parsedById = new Map();
  for (const [filename, content] of files) {
    const id = filename.replace(/\.md$/i, '');
    parsedById.set(id, parseMarkdown(content));
  }

  function resolveLink(rawLink) {
    // Obsidian-Stil: [[ziel#Überschrift]] und [[ziel|Alias]] vor der
    // Auflösung abschneiden.
    const cleaned = rawLink.split('#')[0].split('|')[0].trim();
    const lower = cleaned.toLowerCase();
    return idByLowerName.get(lower) ?? idByBareNameUnambiguous.get(lower.split('/').pop()) ?? null;
  }

  const edges = [];
  const incoming = new Map([...idByLowerName.values()].map(id => [id, 0]));
  const hasOutgoing = new Set();

  for (const [id, data] of parsedById) {
    for (const rawLink of data.links) {
      const targetId = resolveLink(rawLink);
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

function layoutForceDirected(nodes, edges, options = {}) {
  if (nodes.length === 0) return {};

  const width = options.width ?? 800;
  const height = options.height ?? 600;
  const iterations = options.iterations ?? 200;
  const repelStrength = options.repelStrength ?? 2000;
  const linkDistance = options.linkDistance ?? 80;
  // Die Abstoßung ist O(n²) pro Iteration — bei einem über Jahre
  // gewachsenen Vault (mehrere Tausend Dateien) würde das feste
  // Iterations-Limit den Tab für Sekunden bis Minuten einfrieren. Ein
  // Zeitbudget bricht die Simulation vorzeitig ab, sobald die Gesamtzeit
  // überschritten ist — bewusst OHNE einen höheren Mindest-Iterationen-
  // Boden (minIterations bleibt winzig): bei sehr großen Vaults kostet
  // schon eine einzelne Iteration mehrere Hundert Millisekunden, ein
  // fixer Boden wie "mindestens 30 Iterationen" würde das Budget dann
  // selbst ad absurdum führen (30 × 600ms ≈ 18s). `now`/`timeBudgetMs`
  // sind für Tests einstellbar.
  const timeBudgetMs = options.timeBudgetMs ?? 1200;
  const minIterations = Math.min(iterations, options.minIterations ?? 1);
  const now = options.now ?? (() => Date.now());

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

  const startTime = now();
  for (let iter = 0; iter < iterations; iter++) {
    if (iter >= minIterations && now() - startTime > timeBudgetMs) break;
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

// Baut eine Eltern-Kind-Hierarchie statt Pixelpositionen — die Baum-Ansicht
// rendert diese Struktur als ein-/ausklappbare DOM-Liste (siehe
// viewer/render.js, buildTreeDOM), nicht mehr als Canvas-Zeichnung.
function buildTreeHierarchy(nodes, edges, options = {}) {
  if (nodes.length === 0) return { roots: [], childrenOf: {}, parentOf: {} };

  const adjacency = new Map(nodes.map(n => [n.id, []]));
  for (const e of edges) {
    adjacency.get(e.source)?.push(e.target);
    adjacency.get(e.target)?.push(e.source);
  }

  const explicitRoot = options.rootId != null ? nodes.find(n => n.id === options.rootId) : undefined;
  const defaultRoot = nodes.reduce((best, n) => (n.incoming ?? 0) > (best.incoming ?? 0) ? n : best, nodes[0]);

  const parentOf = {};
  const childrenOf = {};
  const visited = new Set();
  const roots = [];

  function bfsFrom(startId) {
    parentOf[startId] = null;
    childrenOf[startId] = [];
    visited.add(startId);
    roots.push(startId);
    const queue = [startId];
    while (queue.length) {
      const current = queue.shift();
      for (const neighbor of adjacency.get(current) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          parentOf[neighbor] = current;
          childrenOf[neighbor] = [];
          childrenOf[current].push(neighbor);
          queue.push(neighbor);
        }
      }
    }
  }

  // Der (ggf. per rootId vorgegebene) Root ist oft ein bewusst bevorzugter
  // Hub-Name (MEMORY/CLAUDE, siehe detectRootNode) statt der am stärksten
  // verlinkte Knoten — ist dieser Root selbst isoliert, darf die Breiten-
  // suche nicht einfach abbrechen und den gesamten Rest des Graphen als
  // "unverlinkt" in denselben Topf werfen. Jede Zusammenhangskomponente
  // bekommt daher ihre eigene BFS: zuerst vom (expliziten oder Standard-)
  // Root aus, danach je unbesuchte Komponente vom dort am stärksten
  // verlinkten Knoten aus — so bleibt die reale Baumstruktur jeder
  // Komponente als eigene Gruppe erhalten, nur echte Einzelgänger werden
  // zu eigenen, kinderlosen Wurzeln.
  bfsFrom((explicitRoot ?? defaultRoot).id);
  while (visited.size < nodes.length) {
    const remaining = nodes.filter(n => !visited.has(n.id));
    const nextRoot = remaining.reduce(
      (best, n) => (adjacency.get(n.id)?.length ?? 0) > (adjacency.get(best.id)?.length ?? 0) ? n : best,
      remaining[0]
    );
    bfsFrom(nextRoot.id);
  }

  return { roots, childrenOf, parentOf };
}

function layoutSphere(nodes, options = {}) {
  if (nodes.length === 0) return {};

  const radius = options.radius ?? 200;
  const rotationY = options.rotationY ?? 0;
  const rotationX = options.rotationX ?? 0;
  const rootId = options.rootId ?? null;
  const positions = {};

  // Freie Drehung um beide Achsen (Ziehen horizontal = Gieren um Y,
  // vertikal = Nicken um X) statt nur um Y — erst um Y, danach das
  // Ergebnis um X drehen (Standard-Euler-Reihenfolge, reicht aus, um
  // jeden Punkt der Kugel in Sichtfeldmitte zu bringen; eine dritte
  // Roll-Achse um die Blickrichtung wäre für eine symmetrische
  // Punktwolke ohnehin nicht unterscheidbar).
  function rotate(x, y, z) {
    const cosY = Math.cos(rotationY), sinY = Math.sin(rotationY);
    const xr = x * cosY + z * sinY;
    const zr1 = z * cosY - x * sinY;

    const cosX = Math.cos(rotationX), sinX = Math.sin(rotationX);
    const yr = y * cosX - zr1 * sinX;
    const zr = y * sinX + zr1 * cosX;

    return { x: xr, y: yr, z: zr };
  }

  if (rootId && nodes.some(n => n.id === rootId)) {
    positions[rootId] = { x3: 0, y3: 0, z3: 0, x: 0, y: 0, scale: 1.4 };
  }

  const rest = nodes.filter(n => n.id !== rootId || !positions[rootId]);
  const count = rest.length;

  const hasRoot = Boolean(rootId && positions[rootId]);

  rest.forEach((n, i) => {
    let x, y, z;
    if (count === 1 && !hasRoot) {
      x = 0; y = 0; z = radius;
    } else {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
      const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);
      x = radius * Math.sin(phi) * Math.cos(theta);
      y = radius * Math.cos(phi);
      z = radius * Math.sin(phi) * Math.sin(theta);
    }

    const r = rotate(x, y, z);
    const perspective = 600 / (600 + r.z);
    positions[n.id] = {
      x3: r.x, y3: r.y, z3: r.z,
      x: r.x * perspective,
      y: r.y * perspective,
      scale: perspective,
    };
  });
  return positions;
}

function layoutMatrixOrder(nodes) {
  return [...nodes]
    .sort((a, b) => {
      const tagA = (a.tags?.[0] ?? '').toLowerCase();
      const tagB = (b.tags?.[0] ?? '').toLowerCase();
      if (tagA !== tagB) return tagA.localeCompare(tagB);
      return a.id.localeCompare(b.id);
    })
    .map(n => n.id);
}

function buildAdjacencyMatrix(orderedIds, edges) {
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

// src/root.js
function detectRootNode(nodes) {
  if (nodes.length === 0) return null;
  const isHub = (id) => /(^|\/)(memory|claude)$/i.test(id);
  const hubs = nodes.filter(n => isHub(n.id));
  const pool = hubs.length > 0 ? hubs : nodes;
  return pool.reduce((best, n) => (n.incoming ?? 0) > (best.incoming ?? 0) ? n : best, pool[0]);
}

function applyFilters(graph, filters = {}) {
  const { activeTags = null, hideOrphans = false, query = '', contentMatchIds = null } = filters;
  const q = query.trim().toLowerCase();

  const nodes = graph.nodes.filter(n => {
    if (hideOrphans && n.orphan) return false;
    if (activeTags && activeTags.length > 0 && !n.tags.some(t => activeTags.includes(t))) return false;
    if (q) {
      const matchesFilename = n.id.toLowerCase().includes(q);
      const matchesContent = contentMatchIds instanceof Set && contentMatchIds.has(n.id);
      if (!matchesFilename && !matchesContent) return false;
    }
    return true;
  });
  const keep = new Set(nodes.map(n => n.id));
  const edges = graph.edges.filter(e => keep.has(e.source) && keep.has(e.target));
  return { nodes, edges };
}

function searchFullText(files, query) {
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

function buildTimelineEvents(logIndexContent) {
  const lines = logIndexContent.split('\n');
  const events = [];
  let inComment = false;
  for (const line of lines) {
    if (inComment) {
      if (line.includes('-->')) inComment = false;
      continue;
    }
    if (line.includes('<!--')) {
      // Eine Kommentarzeile kann sich noch im selben Zeile schließen
      // (<!-- ... -->) — dann bleibt sie weiterhin übersprungen, aber
      // inComment wird nicht gesetzt, da die nächste Zeile normal ist.
      if (!line.includes('-->')) inComment = true;
      continue;
    }
    const match = line.match(/(\d{4}-\d{2}-\d{2})/);
    if (!match) continue;
    events.push({ date: match[1], text: line.replace(/^[-*]\s*/, '').trim() });
  }
  events.sort((a, b) => a.date.localeCompare(b.date));
  return events;
}

// viewer/loader.js
function supportsFileSystemAccess() {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
}

async function collectMarkdownFiles(dirHandle, prefix = '') {
  const files = new Map();
  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind === 'directory') {
      // .obsidian/.git enthalten keine für den Graph relevanten
      // Markdown-Dateien, nur Konfiguration/Versionsverlauf — unnötig
      // (und bei .git potenziell langsam), dort zu rekursieren.
      if (name === '.obsidian' || name === '.git') continue;
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

// webkitRelativePath enthält den Namen des ausgewählten Ordners selbst als
// erstes Pfadsegment (z.B. "demo-vault/projekte/kundenportal.md"), während
// buildGraph (src/parser.js) IDs/Keys OHNE dieses äußere Ordner-Präfix
// erwartet (z.B. "projekte/kundenportal") — genau wie beim Chrome/Edge-Pfad
// (collectMarkdownFiles, der die Rekursion bereits im Inhalt des gewählten
// Ordners beginnt). Also das erste Segment hier abschneiden.
function stripOuterFolder(relativePath) {
  const segments = relativePath.split('/');
  return segments.length > 1 ? segments.slice(1).join('/') : relativePath;
}

async function loadVaultViaDragDrop(fileList) {
  const files = new Map();
  const mdFiles = [...fileList].filter(f => f.name.toLowerCase().endsWith('.md'));
  for (const f of mdFiles) {
    const key = f.webkitRelativePath ? stripOuterFolder(f.webkitRelativePath) : f.name;
    files.set(key, await f.text());
  }
  return files;
}

// viewer/render.js
//
// Drei Designs, umschaltbar über die Theme-Buttons in der Topbar
// (shell.html regelt die CSS-Oberfläche über [data-theme], hier die
// Canvas-Farben, die CSS nicht erreichen kann):
// - dark:  das bisherige, an graphify angelehnte dunkle Design (Standard).
// - light: helles, schlichtes Pendant mit gedämpften Farben, kein Glow.
// - stark: verspieltes "Tony Stark"-HUD — Rot/Gold/Cyan, kräftiger Glow,
//   zusätzlicher Zielring um jeden Knoten (siehe ringForTheme unten).
const THEMES = {
  dark: {
    bg: '#0a0b10',
    edge: 'rgba(232,233,238,0.18)',
    label: '#9094a6',
    highlightLabel: '#e8e9ee',
    tagColors: ['#f2b84b', '#5b9bf5', '#5fd38d', '#e8678a', '#a97cf2', '#4fd1c5', '#f08a4b', '#7f8ff2'],
    matrixCell: '#f2b84b',
    glow: { base: 5, highlighted: 14 },
    ring: false,
  },
  light: {
    bg: '#ffffff',
    edge: 'rgba(17,24,39,0.14)',
    label: '#6b7280',
    highlightLabel: '#111827',
    tagColors: ['#2563eb', '#b45309', '#15803d', '#b91c1c', '#7c3aed', '#0f766e', '#c2410c', '#4338ca'],
    matrixCell: '#2563eb',
    glow: { base: 0, highlighted: 0 },
    ring: false,
  },
  stark: {
    bg: '#05070a',
    edge: 'rgba(0,229,255,0.3)',
    label: '#7fd4f5',
    highlightLabel: '#ffffff',
    tagColors: ['#ff3b30', '#ffd54a', '#00e5ff', '#ff8a3d', '#ffd700', '#36e2ff', '#ff2d78', '#f4ff36'],
    matrixCell: '#ffd54a',
    glow: { base: 10, highlighted: 24 },
    ring: true,
  },
};

let currentTheme = THEMES.dark;

function colorForTag(tag) {
  const colors = currentTheme.tagColors;
  if (!tag) return currentTheme.label;
  let hash = 0;
  for (const ch of tag) hash = (hash * 31 + ch.charCodeAt(0)) % colors.length;
  return colors[hash];
}

function fillBackground(ctx) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = currentTheme.bg;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

// Hellt (percent > 0) oder dunkelt (percent < 0) eine "#rrggbb"-Farbe ab —
// für den Glanzpunkt/Rand jedes Knotens. Alle Theme-Farben (tagColors,
// label, highlightLabel) sind bewusst als Hex definiert, damit das hier
// immer greift.
function shadeColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  let r = (num >> 16) & 0xff, g = (num >> 8) & 0xff, b = num & 0xff;
  if (percent >= 0) {
    r += (255 - r) * percent; g += (255 - g) * percent; b += (255 - b) * percent;
  } else {
    r *= 1 + percent; g *= 1 + percent; b *= 1 + percent;
  }
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

function glowingNode(ctx, x, y, radius, color, highlighted) {
  // Stark-HUD: zusätzlicher, leicht pulsierend wirkender Zielring um jeden
  // Knoten (zwei dünne, halbtransparente Kreise) — rein kosmetisch, ändert
  // keine Trefferflächen (findNodeAt rechnet weiterhin mit `radius`).
  if (currentTheme.ring) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.18;
    ctx.beginPath();
    ctx.arc(x, y, radius + 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = highlighted ? currentTheme.glow.highlighted : currentTheme.glow.base;

  // Radialer Verlauf (heller Glanzpunkt oben links → Grundfarbe → dunklerer
  // Rand) statt einer flachen Füllung — wirkt wie eine kleine Glaskugel
  // statt einem platten Punkt, in allen drei Designs (im hellen Design
  // ohne shadowBlur, aber mit demselben Verlauf+Rand für Tiefe).
  const gradient = ctx.createRadialGradient(
    x - radius * 0.35, y - radius * 0.35, Math.max(radius * 0.05, 0.1),
    x, y, radius
  );
  gradient.addColorStop(0, shadeColor(color, 0.55));
  gradient.addColorStop(0.55, color);
  gradient.addColorStop(1, shadeColor(color, -0.25));

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.lineWidth = highlighted ? 1.5 : 1;
  ctx.strokeStyle = highlighted ? currentTheme.highlightLabel : shadeColor(color, -0.35);
  ctx.globalAlpha = highlighted ? 0.9 : 0.6;
  ctx.stroke();
  ctx.restore();
}

function renderObsidian2D(ctx, graph, positions, options = {}) {
  const { hoveredId = null, selectedId = null, camera = { x: 0, y: 0, scale: 1 } } = options;
  fillBackground(ctx);

  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.scale(camera.scale, camera.scale);

  ctx.strokeStyle = currentTheme.edge;
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
    const highlighted = n.id === hoveredId || n.id === selectedId;
    glowingNode(ctx, p.x, p.y, radius, colorForTag(n.tags?.[0]), highlighted);
    ctx.fillStyle = highlighted ? currentTheme.highlightLabel : currentTheme.label;
    ctx.font = '11px system-ui';
    ctx.fillText(n.id, p.x + radius + 4, p.y + 3);
  }

  ctx.restore();
}

function renderSphere(ctx, graph, positions) {
  fillBackground(ctx);
  const cx = ctx.canvas.width / 2, cy = ctx.canvas.height / 2;

  ctx.strokeStyle = currentTheme.edge;
  for (const e of graph.edges) {
    const s = positions[e.source], t = positions[e.target];
    if (!s || !t) continue;
    ctx.beginPath();
    ctx.moveTo(cx + s.x, cy + s.y);
    ctx.lineTo(cx + t.x, cy + t.y);
    ctx.stroke();
  }

  const sorted = [...graph.nodes].sort((a, b) => (positions[a.id]?.z3 ?? 0) - (positions[b.id]?.z3 ?? 0));
  for (const n of sorted) {
    const p = positions[n.id];
    if (!p) continue;
    const radius = 6 * p.scale;
    ctx.globalAlpha = Math.max(0.35, Math.min(1, p.scale));
    glowingNode(ctx, cx + p.x, cy + p.y, Math.max(radius, 1), colorForTag(n.tags?.[0]), false);
    ctx.globalAlpha = 1;
    ctx.fillStyle = currentTheme.label;
    ctx.font = '11px system-ui';
    ctx.fillText(n.id, cx + p.x + radius + 4, cy + p.y + 3);
  }
}

const MATRIX_MAX_NODES = 150;

function renderMatrix(ctx, orderedIds, matrix) {
  fillBackground(ctx);
  const size = orderedIds.length;

  if (size > MATRIX_MAX_NODES) {
    ctx.fillStyle = currentTheme.label;
    ctx.font = '13px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(
      `Zu viele Dateien für die Matrix-Ansicht (über ${MATRIX_MAX_NODES}) — wähle eine andere Ansicht oder filtere zuerst nach Tag.`,
      ctx.canvas.width / 2,
      ctx.canvas.height / 2
    );
    ctx.textAlign = 'left';
    return;
  }

  const cell = Math.max(4, Math.min(20, Math.floor(600 / Math.max(size, 1))));
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      if (!matrix[i][j]) continue;
      ctx.fillStyle = currentTheme.matrixCell;
      ctx.fillRect(90 + j * cell, 70 + i * cell, cell - 1, cell - 1);
    }
  }
  ctx.fillStyle = currentTheme.label;
  ctx.font = '10px system-ui';
  orderedIds.forEach((id, i) => ctx.fillText(id.length > 12 ? id.slice(0, 11) + '…' : id, 2, 70 + i * cell + cell / 1.5));
}

// offsetX/offsetY kompensieren Ansichten, die ihre Positionen nicht in
// rohen Canvas-Koordinaten zeichnen — z.B. die Kugel-Ansicht, die bei
// cx+p.x/cy+p.y (Canvas-Mitte) zeichnet, siehe renderSphere.
function findNodeAt(positions, x, y, radius = 10, offsetX = 0, offsetY = 0) {
  for (const [id, p] of Object.entries(positions)) {
    if (Math.hypot(p.x + offsetX - x, p.y + offsetY - y) <= radius) return id;
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
  const treeView = document.getElementById('tree-view');
  const mainEl = document.getElementById('main');

  let currentFiles = new Map();
  let contentById = new Map();
  let currentGraph = { nodes: [], edges: [] };
  let activeView = '2d';
  let filters = { activeTags: null, hideOrphans: false, query: '', contentMatchIds: null };
  let selectedNodeId = null;
  let localDepth = 1;
  let hoveredId = null;
  let positions = {};
  let treeHierarchy = { roots: [], childrenOf: {}, parentOf: {} };
  let currentFiltered = { nodes: [], edges: [] };
  let matrixOrderedIds = [];
  let matrixData = [];
  let camera = { x: 0, y: 0, scale: 1 };
  let isPanning = false;
  let panStart = { x: 0, y: 0 };
  let dragStartClient = { x: 0, y: 0 };
  let didDrag = false;
  let sphereManualRotationY = 0;
  let sphereManualRotationX = 0;

  // Die Kamera (Pan/Zoom) gilt nur für die 2D-Ansicht — die Baum-Ansicht ist
  // seit dem graphify-inspirierten Redesign eine ein-/ausklappbare DOM-Liste
  // statt einer Canvas-Zeichnung (siehe buildTreeDOM) und braucht daher
  // keine Kamera-Transformation mehr. renderSphere/Matrix zeichnen ohnehin
  // ohne Kamera-Transform.
  function screenToWorld(screenX, screenY) {
    if (activeView !== '2d') return { x: screenX, y: screenY };
    return { x: (screenX - camera.x) / camera.scale, y: (screenY - camera.y) / camera.scale };
  }

  function centerCameraOnNodeId(id) {
    if (!id || !positions[id]) { camera = { x: 0, y: 0, scale: 1 }; return; }
    camera = {
      x: canvas.width / 2 - positions[id].x,
      y: canvas.height / 2 - positions[id].y,
      scale: 1,
    };
  }

  function centerCameraOnRoot(filteredNodes) {
    // Im lokalen-Graph-Modus (selectedNodeId gesetzt) soll die Kamera auf
    // den tatsächlich angeklickten Knoten zentrieren, nicht auf den per
    // detectRootNode ermittelten Hub des Teilgraphen — sonst springt die
    // Kamera beim Klick ggf. auf einen Nachbarn statt auf den Knoten, auf
    // den der Nutzer tatsächlich geklickt hat.
    if (selectedNodeId && positions[selectedNodeId]) {
      centerCameraOnNodeId(selectedNodeId);
      return;
    }
    const root = detectRootNode(filteredNodes);
    centerCameraOnNodeId(root?.id ?? null);
  }

  // Layout-Neuberechnung ist teuer (layoutForceDirected simuliert bei
  // jedem Aufruf von Grund auf neu). Sie läuft daher nur, wenn sich etwas
  // Layout-Relevantes ändert (Vault geladen, Filter, aktive Ansicht,
  // Auswahl) — NICHT bei jeder Mausbewegung. `redraw()` ist der billige
  // Pfad: zeichnet mit den bereits vorhandenen `positions` neu, z. B. nur
  // um den Hover-Zustand zu aktualisieren.
  function recomputePositions() {
    currentFiltered = selectedNodeId
      ? localGraph(applyFilters(currentGraph, filters), selectedNodeId, localDepth)
      : applyFilters(currentGraph, filters);

    if (activeView === '2d') {
      positions = layoutForceDirected(currentFiltered.nodes, currentFiltered.edges, { width: canvas.width, height: canvas.height, iterations: 150 });
      centerCameraOnRoot(currentFiltered.nodes);
    } else if (activeView === 'tree') {
      treeHierarchy = buildTreeHierarchy(currentFiltered.nodes, currentFiltered.edges, { rootId: detectRootNode(currentFiltered.nodes)?.id });
    } else if (activeView === 'sphere') {
      const root = detectRootNode(currentFiltered.nodes);
      positions = layoutSphere(currentFiltered.nodes, {
        radius: 200,
        rotationY: Date.now() / 6000 + sphereManualRotationY,
        rotationX: sphereManualRotationX,
        rootId: root?.id ?? null,
      });
    } else if (activeView === 'matrix') {
      matrixOrderedIds = layoutMatrixOrder(currentFiltered.nodes);
      matrixData = buildAdjacencyMatrix(matrixOrderedIds, currentFiltered.edges);
    }
  }

  // Zentrale Stelle für Ansagen an Screenreader-Nutzer (aria-live-Region in
  // shell.html) — z.B. bei Knoten-Auswahl, Ansichtswechsel, Vault-Ladung.
  // Fehlt das Element aus irgendeinem Grund, einfach nichts tun statt zu werfen.
  function announce(text) {
    const live = document.getElementById('a11y-live');
    if (live) live.textContent = text;
  }

  function onNodeClick(id) {
    showFileContent(id);
    announce('Datei geöffnet: ' + id);
    if (document.getElementById('local-graph-toggle').checked) {
      selectedNodeId = id;
      recomputeAndDraw();
    }
  }

  function buildTreeDOM() {
    treeView.textContent = '';
    if (currentFiltered.nodes.length === 0) {
      const empty = document.createElement('div');
      empty.id = 'tree-empty';
      empty.textContent = 'Kein Vault geladen — oben „Vault-Ordner öffnen" wählen.';
      treeView.append(empty);
      return;
    }
    const nodeById = new Map(currentFiltered.nodes.map(n => [n.id, n]));

    function rowEl(id, isRoot) {
      const node = nodeById.get(id);
      const row = document.createElement('div');
      row.className = 'tree-row' + (isRoot ? ' tree-row-root' : '') + (id === selectedNodeId ? ' tree-row-selected' : '');
      const dot = document.createElement('span');
      dot.className = 'tree-dot';
      dot.setAttribute('aria-hidden', 'true');
      dot.style.background = colorForTag(node?.tags?.[0]);
      const label = document.createElement('span');
      label.className = 'tree-label';
      label.textContent = id;
      const count = document.createElement('span');
      count.className = 'tree-count';
      const childCount = (treeHierarchy.childrenOf[id] || []).length;
      count.textContent = childCount ? String(childCount) : '';
      row.append(dot, label, count);
      // Tastaturzugriff: die Baum-Ansicht ist die einzige der vier Ansichten,
      // die für Screenreader zugänglich sein soll (siehe sr-only-Hinweis in
      // shell.html) — Zeilen müssen deshalb per Tab erreichbar und per
      // Enter/Leertaste auslösbar sein, nicht nur per Maus-Klick.
      row.tabIndex = 0;
      row.setAttribute('role', 'button');
      row.setAttribute('aria-label', id + (childCount ? `, ${childCount} Unterpunkte` : ''));
      row.addEventListener('click', (e) => { e.stopPropagation(); onNodeClick(id); });
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onNodeClick(id);
        }
      });
      return row;
    }

    function buildNode(id, isRoot) {
      const children = treeHierarchy.childrenOf[id] || [];
      if (children.length === 0) return rowEl(id, isRoot);
      const details = document.createElement('details');
      details.className = 'tree-group';
      details.open = isRoot;
      const summary = document.createElement('summary');
      summary.append(rowEl(id, isRoot));
      details.append(summary);
      const childWrap = document.createElement('div');
      childWrap.className = 'tree-children';
      for (const childId of children) childWrap.append(buildNode(childId, false));
      details.append(childWrap);
      return details;
    }

    for (const rootId of treeHierarchy.roots) {
      treeView.append(buildNode(rootId, true));
    }
  }

  function redraw() {
    const isTree = activeView === 'tree';
    canvas.style.display = isTree ? 'none' : 'block';
    treeView.style.display = isTree ? 'block' : 'none';
    if (!isTree) {
      canvas.setAttribute(
        'aria-label',
        `Graph-Visualisierung (${currentFiltered.nodes.length} Knoten, ` +
          `${currentFiltered.edges.length} Verknüpfungen) — nicht screenreader-` +
          `zugänglich, siehe Baum-Ansicht für eine navigierbare Liste.`
      );
    }

    if (activeView === '2d') {
      renderObsidian2D(ctx, currentFiltered, positions, { hoveredId, selectedId: selectedNodeId, camera });
    } else if (activeView === 'tree') {
      buildTreeDOM();
    } else if (activeView === 'sphere') {
      renderSphere(ctx, currentFiltered, positions);
    } else if (activeView === 'matrix') {
      renderMatrix(ctx, matrixOrderedIds, matrixData);
    }
  }

  function recomputeAndDraw() {
    recomputePositions();
    redraw();
  }

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
      const count = currentGraph.nodes.filter(n => n.tags.includes(tag)).length;
      const dot = document.createElement('span');
      dot.className = 'tree-dot';
      dot.style.background = colorForTag(tag);
      label.append(checkbox, dot, document.createTextNode(`#${tag} (${count})`));
      container.append(label);
    }
  }

  function renderSearchResults(query) {
    const panel = document.getElementById('search-results');
    const searchInput = document.getElementById('search');
    if (!query) {
      panel.style.display = 'none';
      searchInput.setAttribute('aria-expanded', 'false');
      return;
    }
    const matches = searchFullText(currentFiles, query);
    // DOM-Aufbau statt innerHTML mit roher String-Interpolation: Vault-Inhalt
    // (Dateiname/Ausschnitt) kann < & oder HTML-Kommentar-artigen Text
    // enthalten (z.B. von eingefügtem Web-Content) — textContent behandelt
    // das immer als Text, nie als Markup.
    panel.textContent = '';
    for (const m of matches) {
      const row = document.createElement('div');
      row.setAttribute('role', 'option');
      const strong = document.createElement('strong');
      strong.textContent = m.filename;
      row.append(strong, document.createTextNode(': …' + m.excerpt + '…'));
      panel.append(row);
    }
    const hasMatches = matches.length > 0;
    panel.style.display = hasMatches ? 'block' : 'none';
    searchInput.setAttribute('aria-expanded', String(hasMatches));
  }

  let timelineInterval = null;

  function setupTimeline() {
    const logContent = currentFiles.get('log/INDEX.md') ?? '';
    const events = buildTimelineEvents(logContent);
    const slider = document.getElementById('timeline-slider');
    slider.max = String(Math.max(events.length - 1, 0));
    slider.oninput = () => {
      const event = events[Number(slider.value)];
      document.getElementById('timeline-label').textContent = event ? event.text : '';
    };
    if (events.length) slider.oninput();
  }

  document.getElementById('timeline-play').addEventListener('click', (e) => {
    const slider = document.getElementById('timeline-slider');
    // Ohne Ereignisse (slider.max === "0") gibt es nichts abzuspielen —
    // sofort abbrechen, bevor der Pause-Icon-Zustand überhaupt gesetzt
    // wird, sonst flackert die Taste kurz auf '⏸' ohne jede Wirkung.
    if (Number(slider.max) === 0) return;
    if (timelineInterval) {
      clearInterval(timelineInterval);
      timelineInterval = null;
      e.target.textContent = '▶';
      e.target.setAttribute('aria-label', 'Zeitleiste abspielen');
      return;
    }
    e.target.textContent = '⏸';
    e.target.setAttribute('aria-label', 'Zeitleiste pausieren');
    timelineInterval = setInterval(() => {
      const next = Number(slider.value) + 1;
      if (next > Number(slider.max)) {
        // Am Ende der Zeitleiste nicht stoppen, sondern von vorne beginnen
        // — Wiedergabe soll loopen, nicht einmalig durchlaufen.
        slider.value = '0';
        slider.oninput();
        return;
      }
      slider.value = String(next);
      slider.oninput();
    }, 800);
  });

  async function loadFiles(files) {
    // Auswahl/Hover aus dem vorigen Vault zurücksetzen — sonst versuchen
    // recomputePositions/redraw einen lokalen Graph um eine Knoten-ID zu
    // bauen, die im neu geladenen Vault gar nicht existiert, und erzeugen
    // einen leeren Graphen ohne erkennbaren Grund für den Nutzer.
    selectedNodeId = null;
    hoveredId = null;
    // Such-/Inhaltstreffer-Filter des vorigen Vaults zurücksetzen — sonst
    // bleibt ein noch aktiver contentMatchIds-Satz (oder Suchtext) gegen
    // das neu geladene Vault aktiv, bis der Nutzer erneut tippt, und
    // filtert den neuen Graph gegen Treffer, die gar nicht mehr existieren.
    filters = { ...filters, query: '', contentMatchIds: null };
    const searchInput = document.getElementById('search');
    if (searchInput) searchInput.value = '';
    renderSearchResults('');
    // Timeline-Intervall des vorigen Vaults stoppen — sonst feuert es
    // gegen den Slider des neu geladenen Vaults weiter (anderes `max`),
    // und die Play-Taste bleibt auf "⏸" stehen, obwohl nichts mehr läuft.
    if (timelineInterval) {
      clearInterval(timelineInterval);
      timelineInterval = null;
      const playBtn = document.getElementById('timeline-play');
      playBtn.textContent = '▶';
      playBtn.setAttribute('aria-label', 'Zeitleiste abspielen');
    }
    currentFiles = files;
    currentGraph = buildGraph(files);
    contentById = new Map();
    for (const [filename, content] of currentFiles) {
      contentById.set(filename.replace(/\.md$/i, ''), content);
    }
    renderTagFilters();
    resizeCanvas();
    setupTimeline();
    recomputeAndDraw();
    announce(`Vault geladen: ${currentFiles.size} Dateien, ${currentGraph.nodes.length} Knoten.`);
  }

  document.getElementById('open-folder').addEventListener('click', async () => {
    if (supportsFileSystemAccess()) {
      try {
        loadFiles(await loadVaultViaPicker());
      } catch (error) {
        // Der native Ordner-Dialog lehnt mit AbortError ab, wenn der
        // Nutzer ihn einfach abbricht (Escape/Abbrechen) — kein Fehler,
        // einfach nichts tun. Jede andere Fehlerart ist ein echtes
        // Problem und soll nicht verschluckt werden.
        if (error?.name !== 'AbortError') throw error;
      }
    } else {
      document.getElementById('drag-fallback').click();
    }
  });

  document.getElementById('drag-fallback').addEventListener('change', async (e) => {
    loadFiles(await loadVaultViaDragDrop(e.target.files));
  });

  let searchDebounceTimer = null;
  document.getElementById('search').addEventListener('input', (e) => {
    const value = e.target.value;
    renderSearchResults(value);
    // Inhalts-Treffer mit in den Graph-Filter einspeisen: eine Suche, die
    // nur im Dateiinhalt (nicht im Dateinamen) trifft, soll den Knoten im
    // Graph genauso zeigen wie im Ergebnis-Panel — siehe applyFilters in
    // src/filters.js (contentMatchIds).
    const contentMatchIds = value.trim()
      ? new Set(searchFullText(currentFiles, value).map(m => m.filename.replace(/\.md$/i, '')))
      : null;
    filters = { ...filters, query: value, contentMatchIds };
    // Debounce: layoutForceDirected ist eine teure Simulation — bei jedem
    // Tastendruck neu rechnen lassen würde die Eingabe ruckeln lassen.
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      searchDebounceTimer = null;
      recomputeAndDraw();
    }, 150);
  });

  document.getElementById('hide-orphans').addEventListener('change', (e) => {
    filters = { ...filters, hideOrphans: e.target.checked };
    recomputeAndDraw();
  });

  canvas.addEventListener('mousemove', (e) => {
    // Matrix-Zellen stellen Paare von Knoten dar, nicht einzelne
    // Knoten-Positionen im selben Koordinatensinn wie die anderen
    // Ansichten — Hit-Testing hier wäre nicht wohldefiniert, also kein
    // Hover-Highlight in dieser Ansicht.
    if (activeView === 'matrix' || activeView === 'sphere') {
      if (hoveredId !== null) { hoveredId = null; redraw(); }
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    hoveredId = findNodeAt(positions, world.x, world.y, 10 / camera.scale);
    redraw();
  });

  canvas.addEventListener('click', (e) => {
    // Browser lösen nach mousedown+mouseup immer ein click-Event aus, auch
    // wenn sich die Maus dazwischen bewegt hat (ein Drag ist dem DOM
    // zufolge trotzdem ein Klick). Ohne diese Prüfung würde das Loslassen
    // nach einem Pan/Dreh hier landen und recomputeAndDraw() auslösen.
    if (didDrag) { didDrag = false; return; }
    // Siehe Kommentar oben bei mousemove: Klicks in Matrix/3D-Kugel dürfen
    // nicht auf veraltete/falsche positions-Daten treffen (Matrix) bzw.
    // haben kein verlässliches Hit-Testing in der verzerrten Perspektive
    // (Kugel) — dort nur Drehen per Drag, kein Klick-Handling.
    if (activeView === 'matrix' || activeView === 'sphere') return;
    const rect = canvas.getBoundingClientRect();
    const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    const id = findNodeAt(positions, world.x, world.y, 10 / camera.scale);

    if (!id) {
      const hadSelection = Boolean(selectedNodeId) || document.getElementById('info-panel').style.display !== 'none';
      document.getElementById('info-panel').style.display = 'none';
      selectedNodeId = null;
      if (hadSelection) recomputeAndDraw();
      return;
    }

    onNodeClick(id);
  });

  function showFileContent(id) {
    const fileContent = contentById.get(id);
    document.getElementById('info-panel-title').textContent = id;
    document.getElementById('info-panel-content').textContent = fileContent ?? '(Datei nicht gefunden)';
    document.getElementById('info-panel').style.display = 'block';
  }

  document.getElementById('info-panel-close').addEventListener('click', () => {
    document.getElementById('info-panel').style.display = 'none';
  });

  document.getElementById('local-graph-toggle').addEventListener('change', (e) => {
    if (!e.target.checked) selectedNodeId = null;
    document.getElementById('local-depth-slider').disabled = !e.target.checked;
    recomputeAndDraw();
  });

  document.getElementById('local-depth-slider').addEventListener('input', (e) => {
    localDepth = Number(e.target.value);
    document.getElementById('local-depth-label').textContent = String(localDepth);
    if (selectedNodeId) recomputeAndDraw();
  });

  // Wheel-Zoom: skaliert um die Mausposition (nicht um den Ursprung), damit
  // der Punkt unter dem Cursor beim Zoomen stehen bleibt. Nur in der
  // 2D-Ansicht relevant (Baum ist DOM, Kugel/Matrix zoomen nicht).
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (activeView !== '2d') return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const before = screenToWorld(mx, my);
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    camera.scale = Math.min(Math.max(camera.scale * factor, 0.2), 5);
    camera.x = mx - before.x * camera.scale;
    camera.y = my - before.y * camera.scale;
    redraw();
  }, { passive: false });

  // Drag-Pan auf leerer Canvas-Fläche (2D) bzw. Drag-Drehen der 3D-Kugel.
  // Ein Klick auf einen Knoten soll weiterhin die Auswahl auslösen (siehe
  // click-Handler oben), daher startet das Pannen in der 2D-Ansicht nur,
  // wenn unter dem Mausdruck kein Knoten liegt.
  canvas.addEventListener('mousedown', (e) => {
    didDrag = false;
    if (activeView !== '2d' && activeView !== 'sphere') return;
    if (activeView === '2d') {
      const rect = canvas.getBoundingClientRect();
      const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
      if (findNodeAt(positions, world.x, world.y, 10 / camera.scale)) return;
      panStart = { x: e.clientX - camera.x, y: e.clientY - camera.y };
    }
    isPanning = true;
    dragStartClient = { x: e.clientX, y: e.clientY };
  });
  window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    if (!didDrag && Math.hypot(e.clientX - dragStartClient.x, e.clientY - dragStartClient.y) > 3) didDrag = true;
    if (activeView === '2d') {
      camera.x = e.clientX - panStart.x;
      camera.y = e.clientY - panStart.y;
      redraw();
    } else if (activeView === 'sphere') {
      // Horizontal ziehen dreht um Y (Gieren), vertikal um X (Nicken) —
      // zusammen erreicht man jeden Blickwinkel auf die Kugel, nicht nur
      // die Drehung um die senkrechte Achse.
      sphereManualRotationY += (e.clientX - dragStartClient.x) * 0.01;
      sphereManualRotationX += (e.clientY - dragStartClient.y) * 0.01;
      dragStartClient = { x: e.clientX, y: e.clientY };
      recomputeAndDraw();
    }
  });
  window.addEventListener('mouseup', () => { isPanning = false; });

  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeView = btn.dataset.view;
      document.querySelectorAll('[data-view]').forEach(b => {
        const active = b === btn;
        b.classList.toggle('active', active);
        b.setAttribute('aria-selected', String(active));
      });
      announce('Ansicht: ' + btn.textContent);
      recomputeAndDraw();
    });
  });
  document.querySelector('[data-view="2d"]')?.classList.add('active');

  // Theme-Umschalter: dunkel (Standard) / hell / "Stark" (verspieltes HUD).
  // CSS übernimmt die Oberfläche über [data-theme] auf <html> (siehe
  // shell.html), hier zusätzlich die Canvas-Farben (currentTheme), die CSS
  // nicht erreicht. localStorage ist rein eine Komfort-Erinnerung fürs
  // nächste Öffnen — schlägt sie fehl (z.B. privates Fenster), bleibt es
  // einfach beim Standard-Theme, kein Blocker.
  function applyTheme(name) {
    const theme = THEMES[name] ? name : 'dark';
    currentTheme = THEMES[theme];
    document.documentElement.dataset.theme = theme;
    document.querySelectorAll('.theme-btn').forEach(b => {
      const active = b.dataset.theme === theme;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', String(active));
    });
    try { localStorage.setItem('mindvault-theme', theme); } catch { /* z.B. privates Fenster — kein Blocker */ }
    redraw();
    renderTagFilters();
  }

  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => applyTheme(btn.dataset.theme));
  });

  let savedTheme = 'dark';
  try { savedTheme = localStorage.getItem('mindvault-theme') || 'dark'; } catch { /* ignorieren, Standard bleibt */ }
  applyTheme(savedTheme);

  document.getElementById('export-png').addEventListener('click', () => {
    if (activeView === 'tree') return; // Baum ist DOM, kein Canvas-Inhalt zum Exportieren.
    const link = document.createElement('a');
    link.download = `graph-${activeView}-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  });

  // Canvas füllt den verfügbaren Platz im Hauptbereich (#main, neben der
  // Sidebar) statt des ganzen Fensters. Eine Mindestgröße fängt den Fall ab,
  // dass #main beim allerersten Messen noch 0×0 meldet (z.B. Fenster noch
  // nicht fertig layoutet) — ohne Fallback bliebe der Viewer sonst leer/weiß
  // ohne jede Fehlermeldung. resize-Events kommen sehr häufig (z.B. beim
  // Ziehen am Fensterrand), daher wie die Suche debounct, um nicht bei jedem
  // Zwischenschritt die teure Layout-Neuberechnung anzustoßen.
  function resizeCanvas() {
    canvas.width = Math.max(300, mainEl.clientWidth);
    canvas.height = Math.max(200, mainEl.clientHeight);
  }
  resizeCanvas();
  recomputeAndDraw();

  let resizeDebounceTimer = null;
  window.addEventListener('resize', () => {
    if (resizeDebounceTimer) clearTimeout(resizeDebounceTimer);
    resizeDebounceTimer = setTimeout(() => {
      resizeDebounceTimer = null;
      resizeCanvas();
      recomputeAndDraw();
    }, 150);
  });

  // Tiefen-Regler für den lokalen Graph beginnt deaktiviert, da die
  // zugehörige Checkbox ('local-graph-toggle') beim Start unchecked ist.
  document.getElementById('local-depth-slider').disabled = true;
}

window.addEventListener('DOMContentLoaded', initViewer);
