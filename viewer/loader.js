// viewer/loader.js
function supportsFileSystemAccess() {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
}

async function collectMarkdownFiles(dirHandle, prefix = '') {
  const files = new Map();
  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind === 'directory') {
      const nested = await collectMarkdownFiles(handle, prefix + name + '/');
      for (const [k, v] of nested) files.set(k, v);
    } else if (name.toLowerCase().endsWith('.md')) {
      const file = await handle.getFile();
      files.set(prefix + name, await file.text());
    }
  }
  return files;
}

async function loadVaultViaPicker() {
  const dirHandle = await window.showDirectoryPicker();
  return collectMarkdownFiles(dirHandle);
}

// webkitRelativePath enthält den Namen des ausgewählten Ordners selbst als
// erstes Pfadsegment (z.B. "demo-vault/projekte/kundenportal.md"), während
// buildGraph (src/parser.js) IDs/Keys OHNE dieses äußere Ordner-Präfix
// erwartet (z.B. "projekte/kundenportal") — genau wie beim Chrome/Edge-Pfad
// (collectMarkdownFiles, der die Rekursion bereits im Inhalt des gewählten
// Ordners beginnt). Also das erste Segment hier abschneiden.
function stripOuterFolder(relativePath) {
  const segments = relativePath.split('/');
  return segments.length > 1 ? segments.slice(1).join('/') : relativePath;
}

async function loadVaultViaDragDrop(fileList) {
  const files = new Map();
  const mdFiles = [...fileList].filter(f => f.name.toLowerCase().endsWith('.md'));
  for (const f of mdFiles) {
    const key = f.webkitRelativePath ? stripOuterFolder(f.webkitRelativePath) : f.name;
    files.set(key, await f.text());
  }
  return files;
}
