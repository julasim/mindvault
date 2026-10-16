// viewer/build.js
import { readFileSync, writeFileSync } from 'node:fs';

const modules = [
  '../src/parser.js',
  '../src/layout-2d.js',
  '../src/layout-tree.js',
  '../src/layout-sphere.js',
  '../src/layout-matrix.js',
  '../src/root.js',
  '../src/filters.js',
  '../src/timeline.js',
  './loader.js',
  './render.js',
];

const combined = modules
  .map(path => readFileSync(new URL(path, import.meta.url), 'utf8'))
  .join('\n')
  .replace(/^export /gm, '');

// Zwei Dateien statt einer einzigen mit inline eingebettetem Skript: eine
// schlanke HTML-Shell + eine externe graph-viewer.js daneben. Beide bleiben
// lokale Dateien im selben Ordner — kein CDN, kein Server, kein Internet
// nötig, nur per <script src> statt Inline-Ersetzung geladen.
writeFileSync(new URL('./graph-viewer.js', import.meta.url), combined);

const shell = readFileSync(new URL('./shell.html', import.meta.url), 'utf8');
writeFileSync(new URL('./graph-viewer.html', import.meta.url), shell);
console.log('graph-viewer.html + graph-viewer.js gebaut (' + combined.length + ' Zeichen Skript).');
