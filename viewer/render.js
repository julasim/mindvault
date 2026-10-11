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
  let currentFiltered = { nodes: [], edges: [] };

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
    }
    // Baum/3D-Kugel/Matrix-Zweige werden in Task 11 ergänzt.
  }

  function redraw() {
    if (activeView === '2d') {
      renderObsidian2D(ctx, currentFiltered, positions, { hoveredId, selectedId: selectedNodeId });
    }
    // Baum/3D-Kugel/Matrix-Zweige werden in Task 11 ergänzt.
  }

  function recomputeAndDraw() {
    recomputePositions();
    redraw();
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
}

window.addEventListener('DOMContentLoaded', initViewer);
