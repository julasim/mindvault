import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutTree } from '../src/layout-tree.js';

test('Wurzel ist der Knoten mit den meisten eingehenden Links, Kinder liegen eine Ebene tiefer', () => {
  const nodes = [
    { id: 'root', incoming: 2 },
    { id: 'child', incoming: 1 },
    { id: 'lonely', incoming: 0 },
  ];
  const edges = [{ source: 'root', target: 'child' }];
  const positions = layoutTree(nodes, edges, { width: 400, levelHeight: 100 });
  assert.equal(positions.root.y, 40);
  assert.equal(positions.child.y, 140);
});

test('unverlinkter Knoten landet auf Ebene 0, verursacht aber keinen Fehler', () => {
  const nodes = [{ id: 'root', incoming: 1 }, { id: 'lonely', incoming: 0 }];
  const positions = layoutTree(nodes, [], { width: 400 });
  assert.equal(positions.lonely.y, 40);
});

test('leerer Knoten-Satz liefert leeres Ergebnis ohne Fehler', () => {
  assert.deepEqual(layoutTree([], []), {});
});

test('explizite rootId wird als BFS-Wurzel verwendet, auch wenn ein anderer Knoten mehr eingehende Links hat', () => {
  const nodes = [
    { id: 'root', incoming: 2 },
    { id: 'hub', incoming: 5 },
    { id: 'child', incoming: 1 },
  ];
  const edges = [{ source: 'root', target: 'child' }];
  const positions = layoutTree(nodes, edges, { width: 400, levelHeight: 100, rootId: 'root' });
  assert.equal(positions.root.y, 40);
  assert.equal(positions.child.y, 140);
  // hub ist ohne Kante zu root unverlinkt und landet daher ebenfalls auf Ebene 0.
  assert.equal(positions.hub.y, 40);
});

test('zirkuläre Kanten terminieren die Breitensuche', () => {
  const nodes = [{ id: 'a', incoming: 1 }, { id: 'b', incoming: 1 }];
  const edges = [{ source: 'a', target: 'b' }, { source: 'b', target: 'a' }];
  const start = Date.now();
  layoutTree(nodes, edges);
  assert.ok(Date.now() - start < 1000);
});
