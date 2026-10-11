// viewer/build.js
import { readFileSync, writeFileSync } from 'node:fs';

const modules = [
  '../src/parser.js',
  '../src/layout-2d.js',
  '../src/layout-tree.js',
  '../src/layout-sphere.js',
  '../src/layout-matrix.js',
  '../src/filters.js',
  '../src/timeline.js',
  './loader.js',
  './render.js',
];

const combined = modules
  .map(path => readFileSync(new URL(path, import.meta.url), 'utf8'))
  .join('\n')
  .replace(/^export /gm, '');

const shell = readFileSync(new URL('./shell.html', import.meta.url), 'utf8');
const output = shell.replace('/*__INLINE_SCRIPTS__*/', combined);
writeFileSync(new URL('./graph-viewer.html', import.meta.url), output);
console.log('graph-viewer.html gebaut (' + combined.length + ' Zeichen Skript).');
