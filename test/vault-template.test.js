// test/vault-template.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const base = new URL('../vault-template/', import.meta.url);

test('alle Pflichtdateien des Vault-Templates existieren', () => {
  const required = [
    'MEMORY.md', 'CLAUDE.md', 'entscheidungen.md',
    'log/INDEX.md', 'projekte/beispiel-projekt.md',
  ];
  for (const path of required) {
    assert.ok(existsSync(new URL(path, base)), `${path} fehlt`);
  }
});

test('CLAUDE.md dokumentiert alle drei Konventionen', () => {
  const content = readFileSync(new URL('CLAUDE.md', base), 'utf8');
  assert.match(content, /#tag/);
  assert.match(content, /Fällig: YYYY-MM-DD/);
  assert.match(content, /\[\[dateiname\]\]/);
});
