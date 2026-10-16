// Baut eine Eltern-Kind-Hierarchie statt Pixelpositionen — die Baum-Ansicht
// rendert diese Struktur als ein-/ausklappbare DOM-Liste (siehe
// viewer/render.js, buildTreeDOM), nicht mehr als Canvas-Zeichnung.
export function buildTreeHierarchy(nodes, edges, options = {}) {
  if (nodes.length === 0) return { roots: [], childrenOf: {}, parentOf: {} };

  const adjacency = new Map(nodes.map(n => [n.id, []]));
  for (const e of edges) {
    adjacency.get(e.source)?.push(e.target);
    adjacency.get(e.target)?.push(e.source);
  }

  const explicitRoot = options.rootId != null ? nodes.find(n => n.id === options.rootId) : undefined;
  const defaultRoot = nodes.reduce((best, n) => (n.incoming ?? 0) > (best.incoming ?? 0) ? n : best, nodes[0]);

  const parentOf = {};
  const childrenOf = {};
  const visited = new Set();
  const roots = [];

  function bfsFrom(startId) {
    parentOf[startId] = null;
    childrenOf[startId] = [];
    visited.add(startId);
    roots.push(startId);
    const queue = [startId];
    while (queue.length) {
      const current = queue.shift();
      for (const neighbor of adjacency.get(current) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          parentOf[neighbor] = current;
          childrenOf[neighbor] = [];
          childrenOf[current].push(neighbor);
          queue.push(neighbor);
        }
      }
    }
  }

  // Der (ggf. per rootId vorgegebene) Root ist oft ein bewusst bevorzugter
  // Hub-Name (MEMORY/CLAUDE, siehe detectRootNode) statt der am stärksten
  // verlinkte Knoten — ist dieser Root selbst isoliert, darf die Breiten-
  // suche nicht einfach abbrechen und den gesamten Rest des Graphen als
  // "unverlinkt" in denselben Topf werfen. Jede Zusammenhangskomponente
  // bekommt daher ihre eigene BFS: zuerst vom (expliziten oder Standard-)
  // Root aus, danach je unbesuchte Komponente vom dort am stärksten
  // verlinkten Knoten aus — so bleibt die reale Baumstruktur jeder
  // Komponente als eigene Gruppe erhalten, nur echte Einzelgänger werden
  // zu eigenen, kinderlosen Wurzeln.
  bfsFrom((explicitRoot ?? defaultRoot).id);
  while (visited.size < nodes.length) {
    const remaining = nodes.filter(n => !visited.has(n.id));
    const nextRoot = remaining.reduce(
      (best, n) => (adjacency.get(n.id)?.length ?? 0) > (adjacency.get(best.id)?.length ?? 0) ? n : best,
      remaining[0]
    );
    bfsFrom(nextRoot.id);
  }

  return { roots, childrenOf, parentOf };
}
