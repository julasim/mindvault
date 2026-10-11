import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { buildGraph } from '../src/parser.js';

const base = new URL('../demo-vault/', import.meta.url);

function loadDemoVault() {
  const files = new Map();
  const walk = (dir, prefix) => {
    for (const entry of readdirSync(new URL(dir, base), { withFileTypes: true })) {
      if (entry.isDirectory()) walk(dir + entry.name + '/', prefix + entry.name + '/');
      else if (entry.name.endsWith('.md')) {
        files.set(prefix + entry.name, readFileSync(new URL(dir + entry.name, base), 'utf8'));
      }
    }
  };
  walk('', '');
  return files;
}

test('Demo-Vault hat mindestens zwei Projekte mit Tags, einer Fälligkeit und gegenseitigen Links', () => {
  const files = loadDemoVault();
  const { nodes, edges } = buildGraph(files);
  assert.ok(nodes.length >= 5, 'Demo-Vault sollte mehrere Dateien enthalten');
  assert.ok(nodes.some(n => n.tags.length > 0), 'mindestens ein Knoten sollte Tags haben');
  assert.ok(nodes.some(n => n.due !== null), 'mindestens ein Knoten sollte eine Fälligkeit haben');
  assert.ok(edges.length >= 3, 'Demo-Vault sollte mehrfach verlinkt sein');
  assert.ok(!nodes.every(n => n.orphan), 'nicht alle Knoten sollten verwaist sein');
});
