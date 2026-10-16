import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTreeHierarchy } from '../src/layout-tree.js';

test('Wurzel ist der Knoten mit den meisten eingehenden Links, Kind hängt darunter', () => {
  const nodes = [
    { id: 'root', incoming: 2 },
    { id: 'child', incoming: 1 },
    { id: 'lonely', incoming: 0 },
  ];
  const edges = [{ source: 'root', target: 'child' }];
  const { roots, childrenOf, parentOf } = buildTreeHierarchy(nodes, edges);
  assert.deepEqual(childrenOf.root, ['child']);
  assert.equal(parentOf.child, 'root');
  assert.ok(roots.includes('root'));
});

test('unverlinkter Knoten wird zur eigenen, kinderlosen Wurzel statt Fehler', () => {
  const nodes = [{ id: 'root', incoming: 1 }, { id: 'lonely', incoming: 0 }];
  const { roots, childrenOf, parentOf } = buildTreeHierarchy(nodes, []);
  assert.ok(roots.includes('lonely'));
  assert.deepEqual(childrenOf.lonely, []);
  assert.equal(parentOf.lonely, null);
});

test('leerer Knoten-Satz liefert leeres Ergebnis ohne Fehler', () => {
  assert.deepEqual(buildTreeHierarchy([], []), { roots: [], childrenOf: {}, parentOf: {} });
});

test('explizite rootId wird als BFS-Wurzel verwendet, auch wenn ein anderer Knoten mehr eingehende Links hat', () => {
  const nodes = [
    { id: 'root', incoming: 2 },
    { id: 'hub', incoming: 5 },
    { id: 'child', incoming: 1 },
  ];
  const edges = [{ source: 'root', target: 'child' }];
  const { roots, childrenOf, parentOf } = buildTreeHierarchy(nodes, edges, { rootId: 'root' });
  assert.deepEqual(childrenOf.root, ['child']);
  assert.equal(parentOf.child, 'root');
  // hub ist ohne Kante zu root unverlinkt und wird daher zur eigenen Wurzel.
  assert.ok(roots.includes('hub'));
  assert.deepEqual(childrenOf.hub, []);
});

test('ist der erkannte Root selbst isoliert, bleibt die reale Baumstruktur der übrigen Komponente als eigene Gruppe erhalten', () => {
  const nodes = [
    { id: 'MEMORY', incoming: 0 },
    { id: 'a', incoming: 1 },
    { id: 'b', incoming: 1 },
  ];
  const edges = [{ source: 'a', target: 'b' }];
  const { roots, childrenOf, parentOf } = buildTreeHierarchy(nodes, edges, { rootId: 'MEMORY' });
  assert.ok(roots.includes('MEMORY'));
  assert.deepEqual(childrenOf.MEMORY, []);
  assert.ok(roots.includes('a'), '"a" muss eine eigene Wurzel für die zweite Komponente werden');
  assert.deepEqual(childrenOf.a, ['b'], 'b hängt an a, statt isoliert neben MEMORY zu landen');
  assert.equal(parentOf.b, 'a');
});

test('zirkuläre Kanten terminieren die Breitensuche', () => {
  const nodes = [{ id: 'a', incoming: 1 }, { id: 'b', incoming: 1 }];
  const edges = [{ source: 'a', target: 'b' }, { source: 'b', target: 'a' }];
  const start = Date.now();
  buildTreeHierarchy(nodes, edges);
  assert.ok(Date.now() - start < 1000);
});

test('großer Vault (300 Knoten) bleibt innerhalb eines Zeitbudgets', () => {
  const nodes = Array.from({ length: 300 }, (_, i) => ({ id: `n${i}`, incoming: 1 }));
  const edges = Array.from({ length: 150 }, (_, i) => ({ source: `n${i}`, target: `n${(i + 1) % 300}` }));
  const start = Date.now();
  buildTreeHierarchy(nodes, edges);
  assert.ok(Date.now() - start < 1000);
});
