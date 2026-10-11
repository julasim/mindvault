import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectRootNode } from '../src/root.js';

test('bevorzugt MEMORY/CLAUDE als Root, auch wenn ein anderer Knoten mehr eingehende Links hat', () => {
  const nodes = [
    { id: 'MEMORY', incoming: 1 },
    { id: 'projekte/sehr-verlinkt', incoming: 10 },
  ];
  assert.equal(detectRootNode(nodes).id, 'MEMORY');
});

test('CLAUDE als Root erkannt, Groß-/Kleinschreibung egal', () => {
  const nodes = [{ id: 'claude', incoming: 0 }, { id: 'andere', incoming: 5 }];
  assert.equal(detectRootNode(nodes).id, 'claude');
});

test('ohne Hub-Datei gewinnt der Knoten mit den meisten eingehenden Links', () => {
  const nodes = [{ id: 'a', incoming: 1 }, { id: 'b', incoming: 3 }];
  assert.equal(detectRootNode(nodes).id, 'b');
});

test('leerer Knoten-Satz liefert null', () => {
  assert.equal(detectRootNode([]), null);
});
