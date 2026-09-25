import './check.mjs';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(root, 'extension/manifest.json'), 'utf8'));
// Explicit allowlist keeps development files and personal exports out of releases.
const files = [
  'manifest.json', 'background.js', 'organizer.js', 'group-order.js',
  'rules.js', 'options.html', 'options.js', 'url-suggestions.js', 'styles.css',
  ...Object.values(manifest.icons),
].sort();
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
// Standard uncompressed ZIP, with fixed timestamps for reproducible builds.
const localEntries = [];
const centralEntries = [];
let offset = 0;
for (const file of files) {
  const name = Buffer.from(file, 'utf8');
  const data = readFileSync(join(root, 'extension', file));
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
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(directory.length, 12);
end.writeUInt32LE(offset, 16);
mkdirSync(join(root, 'dist'), { recursive: true });
const output = join(root, 'dist', `tab-rules-${manifest.version}.zip`);
writeFileSync(output, Buffer.concat([...localEntries, directory, end]));
console.log(`Packaged ${files.length} extension files: ${output}`);
