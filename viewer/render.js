// viewer/render.js
const TAG_COLORS = ['#6B7280', '#B45309', '#15803D', '#B91C1C', '#2563EB', '#4B5563'];

function colorForTag(tag) {
  if (!tag) return '#888';
  let hash = 0;
  for (const ch of tag) hash = (hash * 31 + ch.charCodeAt(0)) % TAG_COLORS.length;
  return TAG_COLORS[hash];
}

function renderObsidian2D(ctx, graph, positions, options = {}) {
  const { hoveredId = null, selectedId = null, camera = { x: 0, y: 0, scale: 1 } } = options;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.scale(camera.scale, camera.scale);

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
      ctx.shadowColor = '#111827';
      ctx.shadowBlur = 12;
    } else {
      ctx.shadowBlur = 0;
    }
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#374151';
    ctx.font = '11px system-ui';
    ctx.fillText(n.id, p.x + radius + 2, p.y + 3);
  }

  ctx.restore();
}

function renderTree(ctx, graph, positions, options = {}) {
  const { camera = { x: 0, y: 0, scale: 1 } } = options;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.scale(camera.scale, camera.scale);

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
    ctx.fillStyle = '#374151'; ctx.font = '11px system-ui';
    ctx.fillText(n.id, p.x + 10, p.y + 3);
  }

  ctx.restore();
}

function renderSphere(ctx, graph, positions) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
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
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const size = orderedIds.length;
  const cell = Math.max(4, Math.min(20, Math.floor(600 / Math.max(size, 1))));
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      if (!matrix[i][j]) continue;
      ctx.fillStyle = '#4B5563';
      ctx.fillRect(40 + j * cell, 40 + i * cell, cell - 1, cell - 1);
    }
  }
  ctx.fillStyle = '#374151'; ctx.font = '10px system-ui';
  orderedIds.forEach((id, i) => ctx.fillText(id.slice(0, 5), 2, 40 + i * cell + cell / 1.5));
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

  let currentFiles = new Map();
  let currentGraph = { nodes: [], edges: [] };
  let activeView = '2d';
  let filters = { activeTags: null, hideOrphans: false, query: '' };
  let selectedNodeId = null;
  let localDepth = 1;
  let hoveredId = null;
  let positions = {};
  let currentFiltered = { nodes: [], edges: [] };
  let matrixOrderedIds = [];
  let matrixData = [];
  let camera = { x: 0, y: 0, scale: 1 };
  let isPanning = false;
  let panStart = { x: 0, y: 0 };

  function screenToWorld(screenX, screenY) {
    return { x: (screenX - camera.x) / camera.scale, y: (screenY - camera.y) / camera.scale };
  }

  function centerCameraOnRoot(filteredNodes) {
    const root = detectRootNode(filteredNodes);
    if (!root || !positions[root.id]) { camera = { x: 0, y: 0, scale: 1 }; return; }
    camera = {
      x: canvas.width / 2 - positions[root.id].x,
      y: canvas.height / 2 - positions[root.id].y,
      scale: 1,
    };
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
      positions = layoutTree(currentFiltered.nodes, currentFiltered.edges, { width: canvas.width, levelHeight: 90 });
      centerCameraOnRoot(currentFiltered.nodes);
    } else if (activeView === 'sphere') {
      positions = layoutSphere(currentFiltered.nodes, { radius: 200, rotationY: Date.now() / 4000 });
    } else if (activeView === 'matrix') {
      matrixOrderedIds = layoutMatrixOrder(currentFiltered.nodes);
      matrixData = buildAdjacencyMatrix(matrixOrderedIds, currentFiltered.edges);
    }
  }

  function redraw() {
    if (activeView === '2d') {
      renderObsidian2D(ctx, currentFiltered, positions, { hoveredId, selectedId: selectedNodeId, camera });
    } else if (activeView === 'tree') {
      renderTree(ctx, currentFiltered, positions, { camera });
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
      label.append(checkbox, document.createTextNode('#' + tag));
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

  async function loadFiles(files) {
    // Auswahl/Hover aus dem vorigen Vault zurücksetzen — sonst versuchen
    // recomputePositions/redraw einen lokalen Graph um eine Knoten-ID zu
    // bauen, die im neu geladenen Vault gar nicht existiert, und erzeugen
    // einen leeren Graphen ohne erkennbaren Grund für den Nutzer.
    selectedNodeId = null;
    hoveredId = null;
    currentFiles = files;
    currentGraph = buildGraph(files);
    renderTagFilters();
    setupTimeline();
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
    renderSearchResults(e.target.value);
    recomputeAndDraw();
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
    if (activeView === 'matrix') {
      if (hoveredId !== null) { hoveredId = null; redraw(); }
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const offsetX = activeView === 'sphere' ? canvas.width / 2 : 0;
    const offsetY = activeView === 'sphere' ? canvas.height / 2 : 0;
    const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    hoveredId = findNodeAt(positions, world.x, world.y, 10, offsetX, offsetY);
    redraw();
  });

  canvas.addEventListener('click', (e) => {
    // Siehe Kommentar oben bei mousemove: Klicks in der Matrix-Ansicht
    // dürfen nicht auf veraltete/falsche positions-Daten einer anderen
    // Ansicht treffen, also bewusst kein findNodeAt-Aufruf hier.
    if (activeView === 'matrix') return;
    const rect = canvas.getBoundingClientRect();
    const offsetX = activeView === 'sphere' ? canvas.width / 2 : 0;
    const offsetY = activeView === 'sphere' ? canvas.height / 2 : 0;
    const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    const id = findNodeAt(positions, world.x, world.y, 10, offsetX, offsetY);

    if (!id) {
      document.getElementById('info-panel').style.display = 'none';
      selectedNodeId = null;
      recomputeAndDraw();
      return;
    }

    showFileContent(id);
    if (document.getElementById('local-graph-toggle').checked) {
      selectedNodeId = id;
      recomputeAndDraw();
    }
  });

  function showFileContent(id) {
    let fileContent = null;
    for (const [filename, content] of currentFiles) {
      if (filename.replace(/\.md$/i, '') === id) { fileContent = content; break; }
    }
    document.getElementById('info-panel-title').textContent = id;
    document.getElementById('info-panel-content').textContent = fileContent ?? '(Datei nicht gefunden)';
    document.getElementById('info-panel').style.display = 'block';
  }

  document.getElementById('info-panel-close').addEventListener('click', () => {
    document.getElementById('info-panel').style.display = 'none';
  });

  document.getElementById('local-graph-toggle').addEventListener('change', (e) => {
    if (!e.target.checked) selectedNodeId = null;
    recomputeAndDraw();
  });

  document.getElementById('local-depth-slider').addEventListener('input', (e) => {
    localDepth = Number(e.target.value);
    if (selectedNodeId) recomputeAndDraw();
  });

  // Wheel-Zoom: skaliert um die Mausposition (nicht um den Ursprung), damit
  // der Punkt unter dem Cursor beim Zoomen stehen bleibt.
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const before = screenToWorld(mx, my);
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    camera.scale = Math.min(Math.max(camera.scale * factor, 0.2), 5);
    camera.x = mx - before.x * camera.scale;
    camera.y = my - before.y * camera.scale;
    redraw();
  }, { passive: false });

  // Drag-Pan auf leerer Canvas-Fläche. Ein Klick auf einen Knoten soll
  // weiterhin die Auswahl auslösen (siehe click-Handler oben), daher
  // startet das Pannen hier nur, wenn unter dem Mausdruck kein Knoten liegt.
  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    if (findNodeAt(positions, world.x, world.y)) return;
    isPanning = true;
    panStart = { x: e.clientX - camera.x, y: e.clientY - camera.y };
  });
  window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    camera.x = e.clientX - panStart.x;
    camera.y = e.clientY - panStart.y;
    redraw();
  });
  window.addEventListener('mouseup', () => { isPanning = false; });

  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => { activeView = btn.dataset.view; recomputeAndDraw(); });
  });

  document.getElementById('export-png').addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = `graph-${activeView}-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  });
}

window.addEventListener('DOMContentLoaded', initViewer);
