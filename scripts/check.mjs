import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const extension = join(root, 'extension');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
function assert(condition, message) { if (!condition) throw new Error(message); }
for (const file of ['manifest.json', 'manifest.firefox.json']) {
  const manifest = JSON.parse(readFileSync(join(extension, file), 'utf8'));
  assert(manifest.version === pkg.version, `${file}: package and manifest versions must match.`);
  assert(manifest.manifest_version === 3, `${file}: expected Manifest V3.`);
  assert(manifest.background.type === 'module', `${file}: expected module background.`);
  if (file === 'manifest.firefox.json') {
    assert(!manifest.background.service_worker && manifest.background.scripts?.length, 'Firefox requires background scripts.');
    assert(!manifest.minimum_chrome_version, 'Firefox manifest must not include minimum_chrome_version.');
    assert(manifest.browser_specific_settings?.gecko?.id, 'Firefox requires a stable extension ID.');
    assert(Number.parseInt(manifest.browser_specific_settings.gecko.strict_min_version, 10) >= 139, 'Firefox tab groups require Firefox 139+.');
  } else {
    assert(manifest.background.service_worker && !manifest.background.scripts, 'Chrome requires a service worker.');
  }
  const background = manifest.background.scripts ?? [manifest.background.service_worker];
  for (const path of [...background, manifest.options_page, manifest.action.default_popup, ...Object.values(manifest.icons), ...Object.values(manifest.action.default_icon)]) {
    assert(existsSync(join(extension, path)), `Missing manifest resource: ${path}`);
  }
  for (const [size, path] of Object.entries(manifest.icons)) {
    const png = readFileSync(join(extension, path));
    assert(png.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])), `Invalid PNG: ${path}`);
    assert(png.readUInt32BE(16) === Number(size) && png.readUInt32BE(20) === Number(size), `Incorrect icon dimensions: ${path}`);
  }
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
console.log('JavaScript syntax, imports, Chrome/Firefox manifests, versions, and icons verified.');
