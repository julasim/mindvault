export function layoutSphere(nodes, options = {}) {
  if (nodes.length === 0) return {};

  const radius = options.radius ?? 200;
  const rotationY = options.rotationY ?? 0;
  const rootId = options.rootId ?? null;
  const positions = {};

  if (rootId && nodes.some(n => n.id === rootId)) {
    positions[rootId] = { x3: 0, y3: 0, z3: 0, x: 0, y: 0, scale: 1.4 };
  }

  const rest = nodes.filter(n => n.id !== rootId || !positions[rootId]);
  const count = rest.length;

  const hasRoot = Boolean(rootId && positions[rootId]);

  rest.forEach((n, i) => {
    if (count === 1 && !hasRoot) {
      positions[n.id] = { x3: 0, y3: 0, z3: radius, x: 0, y: 0, scale: 1 };
      return;
    }
    const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
    const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    const cosR = Math.cos(rotationY), sinR = Math.sin(rotationY);
    const xr = x * cosR + z * sinR;
    const zr = z * cosR - x * sinR;

    const perspective = 600 / (600 + zr);
    positions[n.id] = {
      x3: xr, y3: y, z3: zr,
      x: xr * perspective,
      y: y * perspective,
      scale: perspective,
    };
  });
  return positions;
}
