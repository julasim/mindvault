export function applyFilters(graph, filters = {}) {
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
