export function parseMarkdown(content) {
  const tags = [...content.matchAll(/#([a-zA-ZäöüÄÖÜß0-9_-]+)/g)].map(m => m[1]);
  const links = [...content.matchAll(/\[\[([^\]]+)\]\]/g)].map(m => m[1].trim());
  const dueMatch = content.match(/Fällig:\s*(\d{4}-\d{2}-\d{2})/);
  return {
    tags: [...new Set(tags)],
    links: [...new Set(links)],
    due: dueMatch ? dueMatch[1] : null,
  };
}

export function buildGraph(files) {
  const idByLowerName = new Map();
  for (const filename of files.keys()) {
    const id = filename.replace(/\.md$/i, '');
    idByLowerName.set(id.toLowerCase(), id);
  }

  const parsedById = new Map();
  for (const [filename, content] of files) {
    const id = filename.replace(/\.md$/i, '');
    parsedById.set(id, parseMarkdown(content));
  }

  const edges = [];
  const incoming = new Map([...idByLowerName.values()].map(id => [id, 0]));
  const hasOutgoing = new Set();

  for (const [id, data] of parsedById) {
    for (const rawLink of data.links) {
      const targetId = idByLowerName.get(rawLink.toLowerCase());
      if (!targetId || targetId === id) continue;
      edges.push({ source: id, target: targetId });
      incoming.set(targetId, (incoming.get(targetId) ?? 0) + 1);
      hasOutgoing.add(id);
    }
  }

  const nodes = [...parsedById].map(([id, data]) => ({
    id,
    tags: data.tags,
    due: data.due,
    incoming: incoming.get(id) ?? 0,
    orphan: (incoming.get(id) ?? 0) === 0 && !hasOutgoing.has(id),
  }));

  return { nodes, edges };
}
