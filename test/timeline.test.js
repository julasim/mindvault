// test/timeline.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTimelineEvents } from '../src/timeline.js';

test('extrahiert Datum und Text pro Zeile, aufsteigend sortiert', () => {
  const content = '- 2026-02-01 — Zweites Ereignis\n- 2026-01-01 — Erstes Ereignis';
  const events = buildTimelineEvents(content);
  assert.equal(events.length, 2);
  assert.equal(events[0].date, '2026-01-01');
  assert.match(events[0].text, /Erstes Ereignis/);
});

test('Zeilen ohne gültiges Datum werden übersprungen, kein Fehler', () => {
  const content = '- kein Datum hier\n- 2026-01-01 — gültig';
  const events = buildTimelineEvents(content);
  assert.equal(events.length, 1);
});

test('leerer Inhalt liefert leeres Array', () => {
  assert.deepEqual(buildTimelineEvents(''), []);
});

test('Zeilen innerhalb eines mehrzeiligen HTML-Kommentars werden übersprungen (Vault-Template-Struktur)', () => {
  const content = [
    '# Sitzungs-Log',
    '',
    '<!-- Beispiel:',
    '- 2026-01-01 — Projekt X aufgesetzt, lief gut.',
    '-->',
    '- 2026-03-01 — echtes Ereignis',
  ].join('\n');
  const events = buildTimelineEvents(content);
  assert.equal(events.length, 1);
  assert.equal(events[0].date, '2026-03-01');
  assert.match(events[0].text, /echtes Ereignis/);
});
