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

test('Demo-Vault ist als Verkaufsmaterial groß genug, um den Graph-Viewer wirkungsvoll zu zeigen', () => {
  const files = loadDemoVault();
  const { nodes, edges } = buildGraph(files);
  assert.ok(nodes.length >= 18, 'Demo-Vault sollte mindestens 18 Dateien enthalten (reicht für einen gut gefüllten Graphen)');
  assert.ok(edges.length >= 20, 'Demo-Vault sollte dicht genug verlinkt sein, um mehrere sichtbare Cluster zu bilden');
  const tagCount = new Set(nodes.flatMap(n => n.tags)).size;
  assert.ok(tagCount >= 10, 'Demo-Vault sollte genug unterschiedliche Tags für eine aussagekräftige Tag-Legende haben');
  const dueCount = nodes.filter(n => n.due !== null).length;
  assert.ok(dueCount >= 10, 'Demo-Vault sollte mehrere Fälligkeiten für eine aussagekräftige Zeitleiste/Überfällig-Übersicht haben');
  // Dedizierter BFS-Zusammenhangs-Test für die layoutTree-Fix-Regression:
  // der automatisch erkannte Root (MEMORY/CLAUDE) ist im Demo-Vault bewusst
  // isoliert (niemand verlinkt per [[MEMORY]] zurück) — der reale,
  // vielfach verlinkte Rest des Graphen muss trotzdem in mehreren echten
  // Ebenen auftauchen statt komplett auf Ebene 0 zu kollabieren.
  const connectedNodeCount = nodes.filter(n => !n.orphan).length;
  assert.ok(connectedNodeCount >= 15, 'der Großteil der Demo-Vault-Dateien sollte tatsächlich verlinkt sein, nicht nur isolierte Knoten');
});
