import { mkdtempSync, readdirSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

function fail(message) {
  process.stderr.write(`pack:check failed: ${message}\n`);
  process.exit(1);
}

function run(cmd, args, cwd) {
  try {
    return execFileSync(cmd, args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    const stderr =
      error && typeof error === 'object' && 'stderr' in error ? String(error.stderr) : '';
    const stdout =
      error && typeof error === 'object' && 'stdout' in error ? String(error.stdout) : '';
    fail(`${cmd} ${args.join(' ')} failed\n${stdout}${stderr}`.trim());
  }
}

function hasEntry(entries, relativePath) {
  const normalized = relativePath.replace(/^\.\//, '');
  return entries.includes(`package/${normalized}`);
}

function hasEntryPrefix(entries, relativePrefix) {
  const normalized = relativePrefix.replace(/^\.\//, '').replace(/\/$/, '');
  return entries.some((entry) => entry.startsWith(`package/${normalized}/`));
}

function collectExportPaths(exportsField, output = []) {
  if (typeof exportsField === 'string') {
    output.push(exportsField);
    return output;
  }

  if (!exportsField || typeof exportsField !== 'object') {
    return output;
  }

  for (const value of Object.values(exportsField)) {
    collectExportPaths(value, output);
  }

  return output;
}

const cwd = process.cwd();
const pkgPath = join(cwd, 'package.json');
let pkg;
try {
  pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
} catch (error) {
  fail(
    `cannot read package.json in ${cwd}: ${error instanceof Error ? error.message : String(error)}`,
  );
}

if (typeof pkg.name !== 'string' || !pkg.name.startsWith('@hexmon_tech/')) {
  fail(`package name must use @hexmon_tech scope (found ${String(pkg.name)})`);
}

const tempDir = mkdtempSync(join(tmpdir(), 'hexmon-pack-'));
try {
  run('pnpm', ['pack', '--pack-destination', tempDir], cwd);
  const tarballs = readdirSync(tempDir).filter((file) => file.endsWith('.tgz'));
  if (tarballs.length !== 1) {
    fail(`expected one tarball, found ${tarballs.length}`);
  }

  const tarPath = join(tempDir, tarballs[0]);
  const rawEntries = run('tar', ['-tf', tarPath], cwd);
  const entries = rawEntries
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (!entries.includes('package/package.json')) {
    fail('tarball missing package/package.json');
  }

  const disallowedPrefixes = ['package/src/', 'package/test/', 'package/tests/', 'package/bench/'];
  for (const prefix of disallowedPrefixes) {
    if (entries.some((entry) => entry.startsWith(prefix))) {
      fail(`tarball contains disallowed path prefix: ${prefix}`);
    }
  }

  if (Array.isArray(pkg.files)) {
    for (const item of pkg.files) {
      if (item === 'dist') {
        if (!hasEntryPrefix(entries, 'dist')) {
          fail('files whitelist includes dist but dist files are missing in tarball');
        }
        continue;
      }

      if (!hasEntry(entries, item)) {
        fail(`files whitelist entry missing from tarball: ${item}`);
      }
    }
  }

  for (const field of ['main', 'module', 'types']) {
    if (typeof pkg[field] === 'string' && !hasEntry(entries, pkg[field])) {
      fail(`${field} points to missing tarball path: ${pkg[field]}`);
    }
  }

  const exportPaths = collectExportPaths(pkg.exports, []);
  for (const exportPath of exportPaths) {
    if (!hasEntry(entries, exportPath)) {
      fail(`exports map points to missing tarball path: ${exportPath}`);
    }
  }

  process.stdout.write(`pack:check ok for ${pkg.name}\n`);
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
