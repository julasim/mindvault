export function layoutSphere(nodes, options = {}) {
  if (nodes.length === 0) return {};

  const radius = options.radius ?? 200;
  const rotationY = options.rotationY ?? 0;
  const rotationX = options.rotationX ?? 0;
  const rootId = options.rootId ?? null;
  const positions = {};

  // Freie Drehung um beide Achsen (Ziehen horizontal = Gieren um Y,
  // vertikal = Nicken um X) statt nur um Y — erst um Y, danach das
  // Ergebnis um X drehen (Standard-Euler-Reihenfolge, reicht aus, um
  // jeden Punkt der Kugel in Sichtfeldmitte zu bringen; eine dritte
  // Roll-Achse um die Blickrichtung wäre für eine symmetrische
  // Punktwolke ohnehin nicht unterscheidbar).
  function rotate(x, y, z) {
    const cosY = Math.cos(rotationY), sinY = Math.sin(rotationY);
    const xr = x * cosY + z * sinY;
    const zr1 = z * cosY - x * sinY;

    const cosX = Math.cos(rotationX), sinX = Math.sin(rotationX);
    const yr = y * cosX - zr1 * sinX;
    const zr = y * sinX + zr1 * cosX;

    return { x: xr, y: yr, z: zr };
  }

  if (rootId && nodes.some(n => n.id === rootId)) {
    positions[rootId] = { x3: 0, y3: 0, z3: 0, x: 0, y: 0, scale: 1.4 };
  }

  const rest = nodes.filter(n => n.id !== rootId || !positions[rootId]);
  const count = rest.length;

  const hasRoot = Boolean(rootId && positions[rootId]);

  rest.forEach((n, i) => {
    let x, y, z;
    if (count === 1 && !hasRoot) {
      x = 0; y = 0; z = radius;
    } else {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
      const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);
      x = radius * Math.sin(phi) * Math.cos(theta);
      y = radius * Math.cos(phi);
      z = radius * Math.sin(phi) * Math.sin(theta);
    }

    const r = rotate(x, y, z);
    const perspective = 600 / (600 + r.z);
    positions[n.id] = {
      x3: r.x, y3: r.y, z3: r.z,
      x: r.x * perspective,
      y: r.y * perspective,
      scale: perspective,
    };
  });
  return positions;
}
