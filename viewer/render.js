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

  ctx.strokeStyle = '#D1D5DB';
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
    ctx.beginPath();
    ctx.arc(cx + p.x, cy + p.y, Math.max(radius, 1), 0, Math.PI * 2);
    ctx.fillStyle = colorForTag(n.tags?.[0]);
    ctx.globalAlpha = Math.max(0.3, Math.min(1, p.scale));
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#374151';
    ctx.font = '11px system-ui';
    ctx.fillText(n.id, cx + p.x + radius + 2, cy + p.y + 3);
  }
}

const MATRIX_MAX_NODES = 150;

function renderMatrix(ctx, orderedIds, matrix) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const size = orderedIds.length;

  if (size > MATRIX_MAX_NODES) {
    ctx.fillStyle = '#374151';
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
      ctx.fillStyle = '#4B5563';
      ctx.fillRect(70 + j * cell, 70 + i * cell, cell - 1, cell - 1);
    }
  }
  ctx.fillStyle = '#374151'; ctx.font = '10px system-ui';
  orderedIds.forEach((id, i) => ctx.fillText(id.length > 10 ? id.slice(0, 9) + '…' : id, 2, 70 + i * cell + cell / 1.5));
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
  let contentById = new Map();
  let currentGraph = { nodes: [], edges: [] };
  let activeView = '2d';
  let filters = { activeTags: null, hideOrphans: false, query: '', contentMatchIds: null };
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
  let dragStartClient = { x: 0, y: 0 };
  let didDrag = false;

  // Die Kamera (Pan/Zoom) ist laut Task 17 nur für die 2D- und
  // Baum-Ansicht gedacht (centerCameraOnRoot wird nur in deren Zweigen von
  // recomputePositions aufgerufen). renderSphere zeichnet ohne
  // Kamera-Transform; screenToWorld muss dort (und in der Matrix-Ansicht)
  // also eine reine Passthrough-Funktion sein, sonst verschiebt ein in 2D/
  // Baum zuvor verändertes camera-Objekt Hit-Tests in der Kugel-Ansicht.
  function screenToWorld(screenX, screenY) {
    if (activeView !== '2d' && activeView !== 'tree') return { x: screenX, y: screenY };
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
      positions = layoutTree(currentFiltered.nodes, currentFiltered.edges, { width: canvas.width, levelHeight: 90, rootId: detectRootNode(currentFiltered.nodes)?.id });
      centerCameraOnRoot(currentFiltered.nodes);
    } else if (activeView === 'sphere') {
      const root = detectRootNode(currentFiltered.nodes);
      positions = layoutSphere(currentFiltered.nodes, { radius: 200, rotationY: Date.now() / 4000, rootId: root?.id ?? null });
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
      const count = currentGraph.nodes.filter(n => n.tags.includes(tag)).length;
      label.append(checkbox, document.createTextNode(`#${tag} (${count})`));
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
    // Toolbar kann durch renderTagFilters wachsen (mehr Tag-Checkboxen,
    // flex-wrap auf eine zusätzliche Zeile) — Canvas muss neu vermessen
    // werden, bevor recomputeAndDraw mit der neuen Höhe zeichnet, sonst
    // bleibt die Canvas auf die alte (kürzere) Toolbar-Höhe skaliert.
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
    if (activeView === 'matrix') {
      if (hoveredId !== null) { hoveredId = null; redraw(); }
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const offsetX = activeView === 'sphere' ? canvas.width / 2 : 0;
    const offsetY = activeView === 'sphere' ? canvas.height / 2 : 0;
    const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    hoveredId = findNodeAt(positions, world.x, world.y, 10 / camera.scale, offsetX, offsetY);
    redraw();
  });

  canvas.addEventListener('click', (e) => {
    // Browser lösen nach mousedown+mouseup immer ein click-Event aus, auch
    // wenn sich die Maus dazwischen bewegt hat (ein Drag ist dem DOM
    // zufolge trotzdem ein Klick). Ohne diese Prüfung würde das Loslassen
    // nach einem Pan hier landen und (da unter dem Cursor kein Knoten
    // liegt) recomputeAndDraw() auslösen, was die Kamera über
    // centerCameraOnRoot sofort auf die alte Position zurückspringen lässt.
    if (didDrag) { didDrag = false; return; }
    // Siehe Kommentar oben bei mousemove: Klicks in der Matrix-Ansicht
    // dürfen nicht auf veraltete/falsche positions-Daten einer anderen
    // Ansicht treffen, also bewusst kein findNodeAt-Aufruf hier.
    if (activeView === 'matrix') return;
    const rect = canvas.getBoundingClientRect();
    const offsetX = activeView === 'sphere' ? canvas.width / 2 : 0;
    const offsetY = activeView === 'sphere' ? canvas.height / 2 : 0;
    const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    const id = findNodeAt(positions, world.x, world.y, 10 / camera.scale, offsetX, offsetY);

    if (!id) {
      const hadSelection = Boolean(selectedNodeId) || document.getElementById('info-panel').style.display !== 'none';
      document.getElementById('info-panel').style.display = 'none';
      selectedNodeId = null;
      if (hadSelection) recomputeAndDraw();
      return;
    }

    showFileContent(id);
    if (document.getElementById('local-graph-toggle').checked) {
      selectedNodeId = id;
      recomputeAndDraw();
    }
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
  // der Punkt unter dem Cursor beim Zoomen stehen bleibt.
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (activeView !== '2d' && activeView !== 'tree') return;
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
    didDrag = false;
    if (activeView !== '2d' && activeView !== 'tree') return;
    const rect = canvas.getBoundingClientRect();
    const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    if (findNodeAt(positions, world.x, world.y, 10 / camera.scale)) return;
    isPanning = true;
    panStart = { x: e.clientX - camera.x, y: e.clientY - camera.y };
    dragStartClient = { x: e.clientX, y: e.clientY };
  });
  window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    if (!didDrag && Math.hypot(e.clientX - dragStartClient.x, e.clientY - dragStartClient.y) > 3) didDrag = true;
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

  // Canvas füllt den verfügbaren Platz unterhalb der Toolbar, statt einer
  // festen Größe — resize-Events kommen sehr häufig (z.B. beim Ziehen am
  // Fensterrand), daher wie die Suche debounct, um nicht bei jedem
  // Zwischenschritt die teure Layout-Neuberechnung anzustoßen.
  function resizeCanvas() {
    const toolbarHeight = document.getElementById('toolbar').offsetHeight;
    canvas.width = window.innerWidth;
    canvas.height = Math.max(200, window.innerHeight - toolbarHeight);
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
