import { createRequire } from 'node:module';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const repoRoot = process.cwd();
const packagesRoot = resolve(repoRoot, 'packages');

function fail(message) {
  process.stderr.write(`exports:check failed: ${message}\n`);
  process.exit(1);
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

function toPackagePath(packageDir, relativePath) {
  return resolve(packageDir, relativePath.replace(/^\.\//, ''));
}

function getExportEntry(exportsField, condition) {
  if (typeof exportsField === 'string') {
    return exportsField;
  }

  if (!exportsField || typeof exportsField !== 'object') {
    return undefined;
  }

  if ('.' in exportsField) {
    return getExportEntry(exportsField['.'], condition);
  }

  const conditionValue = exportsField[condition];
  if (typeof conditionValue === 'string') {
    return conditionValue;
  }

  if (conditionValue && typeof conditionValue === 'object') {
    return getExportEntry(conditionValue, condition);
  }

  if (typeof exportsField.default === 'string') {
    return exportsField.default;
  }

  return undefined;
}

const packageDirs = readdirSync(packagesRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => resolve(packagesRoot, entry.name));

const workspacePackages = packageDirs
  .map((packageDir) => {
    const packageJsonPath = join(packageDir, 'package.json');
    if (!existsSync(packageJsonPath)) {
      return null;
    }

    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    return {
      packageDir,
      packageJson,
    };
  })
  .filter((entry) => entry && typeof entry.packageJson.name === 'string')
  .filter((entry) => entry.packageJson.name.startsWith('@hexmon_tech/'));

for (const { packageDir, packageJson } of workspacePackages) {
  for (const field of ['main', 'module', 'types']) {
    const value = packageJson[field];
    if (typeof value === 'string' && !existsSync(toPackagePath(packageDir, value))) {
      fail(`${packageJson.name}: ${field} points to missing file ${value}`);
    }
  }

  const exportPaths = collectExportPaths(packageJson.exports, []);
  for (const exportPath of exportPaths) {
    if (!existsSync(toPackagePath(packageDir, exportPath))) {
      fail(`${packageJson.name}: exports points to missing file ${exportPath}`);
    }
  }

  try {
    const requireEntry = getExportEntry(packageJson.exports, 'require') ?? packageJson.main;
    if (typeof requireEntry !== 'string') {
      fail(`${packageJson.name}: missing require or main entry`);
    }
    const required = require(toPackagePath(packageDir, requireEntry));
    if (!required || typeof required !== 'object') {
      fail(`${packageJson.name}: require() did not return an object export`);
    }
  } catch (error) {
    fail(
      `${packageJson.name}: require() resolution failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  try {
    const importEntry = getExportEntry(packageJson.exports, 'import') ?? packageJson.module;
    if (typeof importEntry !== 'string') {
      fail(`${packageJson.name}: missing import or module entry`);
    }
    const imported = await import(pathToFileURL(toPackagePath(packageDir, importEntry)).href);
    if (!imported || typeof imported !== 'object') {
      fail(`${packageJson.name}: import() did not return an object export`);
    }
  } catch (error) {
    fail(
      `${packageJson.name}: import() resolution failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  process.stdout.write(`exports:check ok for ${packageJson.name}\n`);
}

process.stdout.write('exports:check passed\n');
