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

async function loadVaultViaDragDrop(fileList) {
  const files = new Map();
  const mdFiles = [...fileList].filter(f => f.name.toLowerCase().endsWith('.md'));
  for (const f of mdFiles) {
    files.set(f.webkitRelativePath || f.name, await f.text());
  }
  return files;
}
