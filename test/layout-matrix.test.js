import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutMatrixOrder, buildAdjacencyMatrix } from '../src/layout-matrix.js';

test('sortiert zuerst nach erstem Tag, dann alphabetisch nach ID', () => {
  const nodes = [
    { id: 'zeta', tags: ['a'] },
    { id: 'alpha', tags: ['a'] },
    { id: 'beta', tags: ['b'] },
  ];
  assert.deepEqual(layoutMatrixOrder(nodes), ['alpha', 'zeta', 'beta']);
});

test('Knoten ohne Tags werden ans Ende der eigenen Gruppe sortiert, ohne Fehler', () => {
  const nodes = [{ id: 'b', tags: [] }, { id: 'a', tags: [] }];
  assert.deepEqual(layoutMatrixOrder(nodes), ['a', 'b']);
});

test('buildAdjacencyMatrix ist symmetrisch und respektiert die Reihenfolge', () => {
  const order = ['a', 'b', 'c'];
  const matrix = buildAdjacencyMatrix(order, [{ source: 'a', target: 'c' }]);
  assert.equal(matrix[0][2], true);
  assert.equal(matrix[2][0], true);
  assert.equal(matrix[0][1], false);
});

test('buildAdjacencyMatrix ignoriert Kanten zu nicht vorhandenen IDs', () => {
  const matrix = buildAdjacencyMatrix(['a'], [{ source: 'a', target: 'unbekannt' }]);
  assert.deepEqual(matrix, [[false]]);
});
