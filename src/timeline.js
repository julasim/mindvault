export function buildTimelineEvents(logIndexContent) {
  const lines = logIndexContent.split('\n');
  const events = [];
  let inComment = false;
  for (const line of lines) {
    if (inComment) {
      if (line.includes('-->')) inComment = false;
      continue;
    }
    if (line.includes('<!--')) {
      // Eine Kommentarzeile kann sich noch im selben Zeile schließen
      // (<!-- ... -->) — dann bleibt sie weiterhin übersprungen, aber
      // inComment wird nicht gesetzt, da die nächste Zeile normal ist.
      if (!line.includes('-->')) inComment = true;
      continue;
    }
    const match = line.match(/(\d{4}-\d{2}-\d{2})/);
    if (!match) continue;
    events.push({ date: match[1], text: line.replace(/^[-*]\s*/, '').trim() });
  }
  events.sort((a, b) => a.date.localeCompare(b.date));
  return events;
}
