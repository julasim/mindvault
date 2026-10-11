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
