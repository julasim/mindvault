// viewer/render.js
const TAG_COLORS = ['#6B7280', '#B45309', '#15803D', '#B91C1C', '#2563EB', '#4B5563'];

function colorForTag(tag) {
  if (!tag) return '#888';
  let hash = 0;
  for (const ch of tag) hash = (hash * 31 + ch.charCodeAt(0)) % TAG_COLORS.length;
  return TAG_COLORS[hash];
}

function renderObsidian2D(ctx, graph, positions, options = {}) {
  const { hoveredId = null, selectedId = null } = options;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

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
}

function renderTree(ctx, graph, positions) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
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
  let currentFiltered = { nodes: [], edges: [] };
  let matrixOrderedIds = [];
  let matrixData = [];

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
    } else if (activeView === 'tree') {
      positions = layoutTree(currentFiltered.nodes, currentFiltered.edges, { width: canvas.width, levelHeight: 90 });
    } else if (activeView === 'sphere') {
      positions = layoutSphere(currentFiltered.nodes, { radius: 200, rotationY: Date.now() / 4000 });
    } else if (activeView === 'matrix') {
      matrixOrderedIds = layoutMatrixOrder(currentFiltered.nodes);
      matrixData = buildAdjacencyMatrix(matrixOrderedIds, currentFiltered.edges);
    }
  }

  function redraw() {
    if (activeView === '2d') {
      renderObsidian2D(ctx, currentFiltered, positions, { hoveredId, selectedId: selectedNodeId });
    } else if (activeView === 'tree') {
      renderTree(ctx, currentFiltered, positions);
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
      document.getElementById('timeline-label').textContent = event ? event.text : '';
    };
    if (events.length) slider.oninput();
  }

  async function loadFiles(files) {
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
    const rect = canvas.getBoundingClientRect();
    hoveredId = findNodeAt(positions, e.clientX - rect.left, e.clientY - rect.top);
    redraw();
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

  document.getElementById('export-png').addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = `graph-${activeView}-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  });
}

window.addEventListener('DOMContentLoaded', initViewer);
