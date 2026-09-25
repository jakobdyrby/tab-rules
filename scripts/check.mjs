import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const extension = join(root, 'extension');
const manifest = JSON.parse(readFileSync(join(extension, 'manifest.json'), 'utf8'));
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
function assert(condition, message) { if (!condition) throw new Error(message); }
assert(manifest.version === pkg.version, 'Package and manifest versions must match.');
assert(manifest.manifest_version === 3, 'Expected Manifest V3.');
for (const path of [manifest.background.service_worker, manifest.options_page, ...Object.values(manifest.icons), ...Object.values(manifest.action.default_icon)]) {
  assert(existsSync(join(extension, path)), `Missing manifest resource: ${path}`);
}
for (const [size, path] of Object.entries(manifest.icons)) {
  const png = readFileSync(join(extension, path));
  assert(png.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])), `Invalid PNG: ${path}`);
  assert(png.readUInt32BE(16) === Number(size) && png.readUInt32BE(20) === Number(size), `Incorrect icon dimensions: ${path}`);
}
function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)]);
}
for (const path of ['extension', 'test', 'scripts'].flatMap(dir => walk(join(root, dir))).filter(path => /\.(m?js)$/.test(path))) {
  const result = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' });
  assert(result.status === 0, result.stderr || `Syntax check failed: ${path}`);
  const source = readFileSync(path, 'utf8');
  for (const match of source.matchAll(/(?:from\s+|import\s*)['"](\.[^'"]+)['"]/g)) {
    assert(existsSync(resolve(dirname(path), match[1])), `Missing import in ${path}: ${match[1]}`);
  }
}
console.log('JavaScript syntax, imports, manifest, versions, and icons verified.');
