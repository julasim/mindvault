// test/parser.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMarkdown, buildGraph } from '../src/parser.js';

test('parseMarkdown extrahiert Tags, Links und Fälligkeit', () => {
  const content = '#patio #security Fällig: 2026-11-01 siehe [[entscheidungen]] und [[projekte/patio]]';
  const result = parseMarkdown(content);
  assert.deepEqual(result.tags, ['patio', 'security']);
  assert.deepEqual(result.links, ['entscheidungen', 'projekte/patio']);
  assert.equal(result.due, '2026-11-01');
});

test('parseMarkdown liefert null bei fehlendem/fehlerhaftem Fälligkeitsdatum', () => {
  assert.equal(parseMarkdown('kein Datum hier').due, null);
  assert.equal(parseMarkdown('Fällig: nächsten Montag').due, null);
});

test('buildGraph zählt eingehende Links und erkennt verwaiste Dateien', () => {
  const files = new Map([
    ['a.md', 'siehe [[b]]'],
    ['b.md', 'kein Link'],
    ['c.md', 'ganz allein'],
  ]);
  const { nodes, edges } = buildGraph(files);
  assert.equal(edges.length, 1);
  assert.equal(nodes.find(n => n.id === 'b').incoming, 1);
  assert.equal(nodes.find(n => n.id === 'c').orphan, true);
});

test('buildGraph löst Unicode-Dateinamen case-insensitiv auf', () => {
  const files = new Map([
    ['Entscheidungen-Übersicht.md', 'Startpunkt'],
    ['projekt.md', 'siehe [[entscheidungen-übersicht]]'],
  ]);
  const { edges } = buildGraph(files);
  assert.equal(edges.length, 1);
  assert.equal(edges[0].target, 'Entscheidungen-Übersicht');
});

test('buildGraph bricht bei zirkulärer Verlinkung (A→B→A) nicht ab und erzeugt keine Dopplungen', () => {
  const files = new Map([
    ['a.md', 'siehe [[b]]'],
    ['b.md', 'siehe [[a]]'],
  ]);
  const { edges } = buildGraph(files);
  assert.equal(edges.length, 2);
});

test('buildGraph ignoriert Selbstverweise', () => {
  const files = new Map([['a.md', 'siehe [[a]]']]);
  const { edges } = buildGraph(files);
  assert.equal(edges.length, 0);
});

test('buildGraph löst einen bloßen Dateinamen-Link auf eine Datei in einem Unterordner auf', () => {
  const files = new Map([
    ['projekte/kundenportal.md', 'Inhalt'],
    ['MEMORY.md', 'siehe [[kundenportal]]'],
  ]);
  const { edges } = buildGraph(files);
  assert.equal(edges.length, 1);
  assert.equal(edges[0].target, 'projekte/kundenportal');
});

test('buildGraph löst [[ziel|Alias]]-Links korrekt nach dem Ziel auf', () => {
  const files = new Map([
    ['entscheidungen.md', 'Inhalt'],
    ['a.md', 'siehe [[entscheidungen|Unsere Entscheidungen]]'],
  ]);
  const { edges } = buildGraph(files);
  assert.equal(edges.length, 1);
  assert.equal(edges[0].target, 'entscheidungen');
});

test('buildGraph löst [[ziel#Überschrift]]-Links korrekt nach dem Ziel auf', () => {
  const files = new Map([
    ['entscheidungen.md', 'Inhalt'],
    ['a.md', 'siehe [[entscheidungen#2026-01-01 — Titel]]'],
  ]);
  const { edges } = buildGraph(files);
  assert.equal(edges.length, 1);
  assert.equal(edges[0].target, 'entscheidungen');
});

test('buildGraph löst einen mehrdeutigen bloßen Dateinamen NICHT auf', () => {
  const files = new Map([
    ['projekte/kundenportal.md', 'Inhalt A'],
    ['archiv/kundenportal.md', 'Inhalt B'],
    ['MEMORY.md', 'siehe [[kundenportal]]'],
  ]);
  const { edges } = buildGraph(files);
  assert.equal(edges.length, 0);
});
