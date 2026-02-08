import { promises as fs } from 'node:fs';
import path from 'node:path';

/** Resolve a path from cwd in a cross-platform-safe way. */
export function resolvePath(inputPath: string, cwd = process.cwd()): string {
  return path.resolve(cwd, inputPath);
}

/** Ensure a directory exists. */
export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

/** Read and parse a JSON file with context-rich errors. */
export async function readJson<T>(filePath: string): Promise<T> {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content) as T;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
    }

    if (error instanceof Error) {
      throw new Error(`Failed to read ${filePath}: ${error.message}`);
    }

    throw new Error(`Failed to read ${filePath}.`);
  }
}

/** Atomically write a file by writing to a temp file first then renaming. */
export async function writeFileAtomic(filePath: string, content: string): Promise<void> {
  const directory = path.dirname(filePath);
  const base = path.basename(filePath);
  const temporary = path.join(directory, `.${base}.${process.pid}.${Date.now()}.tmp`);

  await ensureDir(directory);
  await fs.writeFile(temporary, content, 'utf8');
  await fs.rename(temporary, filePath);
}

/** Recursively collect files under a directory. */
export async function listFilesRecursive(dirPath: string): Promise<string[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursive(fullPath)));
      continue;
    }

    if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

/** Check whether a path exists. */
export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
