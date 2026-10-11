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

  // Zweite Lookup-Tabelle für Obsidian-Stil-Auflösung nach bloßem
  // Dateinamen (letztes Pfadsegment), nur wenn eindeutig — mehrdeutige
  // Namen (zwei Dateien gleichen Namens in unterschiedlichen Ordnern)
  // werden bewusst nicht aufgelöst, um kein falsches Ziel zu raten.
  const idsByBareName = new Map();
  for (const id of idByLowerName.values()) {
    const bareName = id.split('/').pop().toLowerCase();
    if (!idsByBareName.has(bareName)) idsByBareName.set(bareName, []);
    idsByBareName.get(bareName).push(id);
  }
  const idByBareNameUnambiguous = new Map();
  for (const [bareName, ids] of idsByBareName) {
    if (ids.length === 1) idByBareNameUnambiguous.set(bareName, ids[0]);
  }

  const parsedById = new Map();
  for (const [filename, content] of files) {
    const id = filename.replace(/\.md$/i, '');
    parsedById.set(id, parseMarkdown(content));
  }

  function resolveLink(rawLink) {
    // Obsidian-Stil: [[ziel#Überschrift]] und [[ziel|Alias]] vor der
    // Auflösung abschneiden.
    const cleaned = rawLink.split('#')[0].split('|')[0].trim();
    const lower = cleaned.toLowerCase();
    return idByLowerName.get(lower) ?? idByBareNameUnambiguous.get(lower.split('/').pop()) ?? null;
  }

  const edges = [];
  const incoming = new Map([...idByLowerName.values()].map(id => [id, 0]));
  const hasOutgoing = new Set();

  for (const [id, data] of parsedById) {
    for (const rawLink of data.links) {
      const targetId = resolveLink(rawLink);
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
