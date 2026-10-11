import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutSphere } from '../src/layout-sphere.js';

test('einzelner Knoten liegt zentriert', () => {
  const result = layoutSphere([{ id: 'only' }]);
  assert.equal(result.only.x, 0);
  assert.equal(result.only.y, 0);
});

test('alle Knoten liegen exakt auf dem angegebenen Kugelradius', () => {
  const nodes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
  const positions = layoutSphere(nodes, { radius: 100 });
  for (const id of ['a', 'b', 'c', 'd']) {
    const p = positions[id];
    const dist = Math.sqrt(p.x3 ** 2 + p.y3 ** 2 + p.z3 ** 2);
    assert.ok(Math.abs(dist - 100) < 0.001);
  }
});

test('Rotation verändert die projizierte x-Koordinate', () => {
  const nodes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const p0 = layoutSphere(nodes, { radius: 100, rotationY: 0 });
  const p1 = layoutSphere(nodes, { radius: 100, rotationY: Math.PI / 2 });
  assert.notEqual(p0.a.x, p1.a.x);
});

test('leerer Knoten-Satz liefert leeres Ergebnis ohne Fehler', () => {
  assert.deepEqual(layoutSphere([]), {});
});

test('Root + genau ein weiterer Knoten: der verbleibende Knoten liegt nicht auf dem Root (0,0)', () => {
  const nodes = [{ id: 'root' }, { id: 'only' }];
  const positions = layoutSphere(nodes, { radius: 100, rootId: 'root' });
  assert.equal(positions.root.x3, 0);
  assert.equal(positions.root.y3, 0);
  assert.equal(positions.root.z3, 0);
  const dist = Math.sqrt(positions.only.x3 ** 2 + positions.only.y3 ** 2 + positions.only.z3 ** 2);
  assert.ok(Math.abs(dist - 100) < 0.001);
  assert.ok(!(positions.only.x === 0 && positions.only.y === 0), 'einziger Rest-Knoten darf nicht auf derselben Projektion wie der Root liegen');
});

test('rootId wird exakt ins Zentrum gezwungen, restliche Knoten verteilen sich weiter auf der Kugel', () => {
  const nodes = [{ id: 'root' }, { id: 'a' }, { id: 'b' }, { id: 'c' }];
  const positions = layoutSphere(nodes, { radius: 100, rootId: 'root' });
  assert.equal(positions.root.x3, 0);
  assert.equal(positions.root.y3, 0);
  assert.equal(positions.root.z3, 0);
  for (const id of ['a', 'b', 'c']) {
    const p = positions[id];
    const dist = Math.sqrt(p.x3 ** 2 + p.y3 ** 2 + p.z3 ** 2);
    assert.ok(Math.abs(dist - 100) < 0.001);
  }
});
