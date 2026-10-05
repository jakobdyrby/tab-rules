import './check.mjs';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Explicit allowlist keeps development files and personal exports out of releases.
const runtimeFiles = [
  'manifest.json', 'background.js', 'browser-api.js', 'organizer.js', 'group-order.js',
  'manual-actions.js', 'popup.html', 'popup.js', 'popup.css',
  'rules.js', 'options.html', 'options.js', 'url-suggestions.js', 'styles.css',
];
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
// Standard uncompressed ZIP, with fixed timestamps for reproducible builds.
function createZip(entries) {
  const localEntries = [];
  const centralEntries = [];
  let offset = 0;
  for (const [file, data] of entries) {
    const name = Buffer.from(file, 'utf8');
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x800, 6);
    local.writeUInt16LE(33, 12); // 1980-01-01
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    localEntries.push(local, name, data);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x800, 8);
    central.writeUInt16LE(33, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centralEntries.push(central, name);
    offset += local.length + name.length + data.length;
  }
  const directory = Buffer.concat(centralEntries);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...localEntries, directory, end]);
}

for (const browser of ['chrome', 'firefox']) {
  const manifestPath = browser === 'firefox' ? 'manifest.firefox.json' : 'manifest.json';
  const manifest = JSON.parse(readFileSync(join(root, 'extension', manifestPath), 'utf8'));
  const files = [...new Set([...runtimeFiles, ...Object.values(manifest.icons), ...Object.values(manifest.action.default_icon)])].sort();
  const entries = files.map(file => [file, readFileSync(join(root, 'extension', file === 'manifest.json' ? manifestPath : file))]);
  const directory = join(root, 'dist', browser);
  for (const [file, data] of entries) {
    const path = join(directory, file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, data);
  }
  // Preserve the existing Chrome release filename.
  const suffix = browser === 'firefox' ? '-firefox' : '';
  const output = join(root, 'dist', `tab-rules-${manifest.version}${suffix}.zip`);
  writeFileSync(output, createZip(entries));
  console.log(`Packaged ${entries.length} ${browser} extension files: ${output}`);
}
