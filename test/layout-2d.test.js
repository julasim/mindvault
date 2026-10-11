import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutForceDirected } from '../src/layout-2d.js';

test('platziert jeden Knoten innerhalb der Grenzen und ist deterministisch', () => {
  const nodes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const edges = [{ source: 'a', target: 'b' }];
  const p1 = layoutForceDirected(nodes, edges, { width: 400, height: 300, iterations: 50 });
  const p2 = layoutForceDirected(nodes, edges, { width: 400, height: 300, iterations: 50 });
  assert.deepEqual(p1, p2);
  for (const id of ['a', 'b', 'c']) {
    assert.ok(Number.isFinite(p1[id].x) && Number.isFinite(p1[id].y));
    assert.ok(p1[id].x >= 0 && p1[id].x <= 400);
  }
});

test('einzelner Knoten ohne Kanten (leerer/verwaister Vault) stürzt nicht ab', () => {
  const positions = layoutForceDirected([{ id: 'solo' }], [], { iterations: 10 });
  assert.ok(positions.solo);
  assert.ok(Number.isFinite(positions.solo.x));
});

test('leerer Knoten-Satz liefert leeres Ergebnis ohne Fehler', () => {
  assert.deepEqual(layoutForceDirected([], []), {});
});

test('zirkuläre Kanten (A→B, B→A) laufen nicht in eine Endlosschleife und terminieren', () => {
  const nodes = [{ id: 'a' }, { id: 'b' }];
  const edges = [{ source: 'a', target: 'b' }, { source: 'b', target: 'a' }];
  const start = Date.now();
  const positions = layoutForceDirected(nodes, edges, { iterations: 100 });
  assert.ok(Date.now() - start < 1000);
  assert.ok(positions.a && positions.b);
});

test('großer Vault (300 Knoten) bleibt innerhalb eines Zeitbudgets', () => {
  const nodes = Array.from({ length: 300 }, (_, i) => ({ id: `n${i}` }));
  const edges = Array.from({ length: 150 }, (_, i) => ({ source: `n${i}`, target: `n${(i + 1) % 300}` }));
  const start = Date.now();
  layoutForceDirected(nodes, edges, { iterations: 80 });
  assert.ok(Date.now() - start < 3000, 'Layout-Berechnung darf den Tab nicht mehrere Sekunden einfrieren');
});
