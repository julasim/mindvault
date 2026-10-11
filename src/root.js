// src/root.js
export function detectRootNode(nodes) {
  if (nodes.length === 0) return null;
  const isHub = (id) => /(^|\/)(memory|claude)$/i.test(id);
  const hubs = nodes.filter(n => isHub(n.id));
  const pool = hubs.length > 0 ? hubs : nodes;
  return pool.reduce((best, n) => (n.incoming ?? 0) > (best.incoming ?? 0) ? n : best, pool[0]);
}
