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
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = highlighted ? currentTheme.glow.highlighted : currentTheme.glow.base;
  ctx.fill();
  ctx.shadowBlur = 0;
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
  let sphereManualRotation = 0;

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
      positions = layoutSphere(currentFiltered.nodes, { radius: 200, rotationY: Date.now() / 6000 + sphereManualRotation, rootId: root?.id ?? null });
    } else if (activeView === 'matrix') {
      matrixOrderedIds = layoutMatrixOrder(currentFiltered.nodes);
      matrixData = buildAdjacencyMatrix(matrixOrderedIds, currentFiltered.edges);
    }
  }

  function onNodeClick(id) {
    showFileContent(id);
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
      dot.style.background = colorForTag(node?.tags?.[0]);
      const label = document.createElement('span');
      label.className = 'tree-label';
      label.textContent = id;
      const count = document.createElement('span');
      count.className = 'tree-count';
      const childCount = (treeHierarchy.childrenOf[id] || []).length;
      count.textContent = childCount ? String(childCount) : '';
      row.append(dot, label, count);
      row.addEventListener('click', (e) => { e.stopPropagation(); onNodeClick(id); });
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
    if (!query) { panel.style.display = 'none'; return; }
    const matches = searchFullText(currentFiles, query);
    // DOM-Aufbau statt innerHTML mit roher String-Interpolation: Vault-Inhalt
    // (Dateiname/Ausschnitt) kann < & oder HTML-Kommentar-artigen Text
    // enthalten (z.B. von eingefügtem Web-Content) — textContent behandelt
    // das immer als Text, nie als Markup.
    panel.textContent = '';
    for (const m of matches) {
      const row = document.createElement('div');
      const strong = document.createElement('strong');
      strong.textContent = m.filename;
      row.append(strong, document.createTextNode(': …' + m.excerpt + '…'));
      panel.append(row);
    }
    panel.style.display = matches.length ? 'block' : 'none';
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
      return;
    }
    e.target.textContent = '⏸';
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
      document.getElementById('timeline-play').textContent = '▶';
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
      sphereManualRotation += (e.clientX - dragStartClient.x) * 0.01;
      dragStartClient = { x: e.clientX, y: e.clientY };
      recomputeAndDraw();
    }
  });
  window.addEventListener('mouseup', () => { isPanning = false; });

  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeView = btn.dataset.view;
      document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('active', b === btn));
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
    document.querySelectorAll('.theme-btn').forEach(b => b.classList.toggle('active', b.dataset.theme === theme));
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
