export function buildTimelineEvents(logIndexContent) {
  const lines = logIndexContent.split('\n');
  const events = [];
  for (const line of lines) {
    const match = line.match(/(\d{4}-\d{2}-\d{2})/);
    if (!match) continue;
    events.push({ date: match[1], text: line.replace(/^[-*]\s*/, '').trim() });
  }
  events.sort((a, b) => a.date.localeCompare(b.date));
  return events;
}
