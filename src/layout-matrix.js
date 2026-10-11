export function layoutMatrixOrder(nodes) {
  return [...nodes]
    .sort((a, b) => {
      const tagA = (a.tags?.[0] ?? '').toLowerCase();
      const tagB = (b.tags?.[0] ?? '').toLowerCase();
      if (tagA !== tagB) return tagA.localeCompare(tagB);
      return a.id.localeCompare(b.id);
    })
    .map(n => n.id);
}

export function buildAdjacencyMatrix(orderedIds, edges) {
  const index = new Map(orderedIds.map((id, i) => [id, i]));
  const size = orderedIds.length;
  const matrix = Array.from({ length: size }, () => new Array(size).fill(false));
  for (const e of edges) {
    const i = index.get(e.source), j = index.get(e.target);
    if (i === undefined || j === undefined) continue;
    matrix[i][j] = true;
    matrix[j][i] = true;
  }
  return matrix;
}
