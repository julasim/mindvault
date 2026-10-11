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
