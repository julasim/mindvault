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

test('sehr großer Vault (2000 Knoten) bricht dank Zeitbudget vorzeitig ab statt den Tab einzufrieren', () => {
  // Ohne Zeitbudget läuft dieselbe Eingabe (2000 Knoten, 200 Iterationen,
  // O(n²)-Abstoßung) mehrere Sekunden — das Budget muss die Simulation
  // nach minIterations spürbar früher beenden.
  const nodes = Array.from({ length: 2000 }, (_, i) => ({ id: `n${i}` }));
  const edges = Array.from({ length: 1000 }, (_, i) => ({ source: `n${i}`, target: `n${(i + 1) % 2000}` }));
  const start = Date.now();
  const positions = layoutForceDirected(nodes, edges, { iterations: 200, timeBudgetMs: 300, minIterations: 10 });
  const elapsed = Date.now() - start;
  assert.ok(elapsed < 1500, `Zeitbudget nicht eingehalten: ${elapsed}ms`);
  assert.ok(positions.n0 && Number.isFinite(positions.n0.x));
});

test('Zeitbudget greift nicht vor minIterations, selbst wenn now() sofort das Budget überschreitet', () => {
  const nodes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const edges = [{ source: 'a', target: 'b' }];
  let callsBeforeCheck = 0;
  const fakeNow = () => { callsBeforeCheck++; return callsBeforeCheck * 10000; }; // "vergeht" sofort massiv Zeit
  // Ohne den minIterations-Schutz würde die Simulation bereits nach der
  // allerersten Iteration abbrechen, weil now() sofort ein riesiges Delta
  // meldet — die Positionen blieben dann exakt beim Startkreis stehen.
  const stoppedEarly = layoutForceDirected(nodes, edges, {
    iterations: 100, minIterations: 0, timeBudgetMs: 1, now: fakeNow,
  });
  callsBeforeCheck = 0;
  const ranMinIterations = layoutForceDirected(nodes, edges, {
    iterations: 100, minIterations: 20, timeBudgetMs: 1, now: fakeNow,
  });
  assert.notDeepEqual(stoppedEarly, ranMinIterations,
    'mit minIterations muss sich der Graph trotz "abgelaufenem" Budget weiterbewegen');
});
