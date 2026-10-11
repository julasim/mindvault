import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyFilters, searchFullText } from '../src/filters.js';

const graph = {
  nodes: [
    { id: 'a', tags: ['patio'], orphan: false },
    { id: 'b', tags: ['security'], orphan: false },
    { id: 'c', tags: [], orphan: true },
  ],
  edges: [{ source: 'a', target: 'b' }],
};

test('activeTags filtert auf passende Knoten und zugehörige Kanten', () => {
  const result = applyFilters(graph, { activeTags: ['patio'] });
  assert.deepEqual(result.nodes.map(n => n.id), ['a']);
  assert.equal(result.edges.length, 0);
});

test('hideOrphans blendet verwaiste Knoten aus', () => {
  const result = applyFilters(graph, { hideOrphans: true });
  assert.ok(!result.nodes.some(n => n.id === 'c'));
});

test('query filtert nach Dateiname-Teilstring, case-insensitiv', () => {
  const result = applyFilters(graph, { query: 'A' });
  assert.deepEqual(result.nodes.map(n => n.id), ['a']);
});

test('ohne Filter bleibt der gesamte Graph erhalten', () => {
  const result = applyFilters(graph, {});
  assert.equal(result.nodes.length, 3);
});

test('searchFullText findet alle Treffer mit Kontext-Ausschnitt', () => {
  const files = new Map([['a.md', 'Hier steht Patio-Security Kontext.']]);
  const matches = searchFullText(files, 'Security');
  assert.equal(matches.length, 1);
  assert.match(matches[0].excerpt, /Security/i);
});

test('searchFullText liefert leeres Array bei leerer Anfrage', () => {
  assert.deepEqual(searchFullText(new Map([['a.md', 'x']]), ''), []);
});
