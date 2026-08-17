import { chmod, lstat, mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DIRECTORY_MODE = 0o700;
const FILE_MODE = 0o600;

export interface HushHome {
  root: string;
  config: string;
  uiState: string;
  logs: string;
  cache: string;
  temporary: string;
}

export function resolveHushHome(userHome = homedir()): HushHome {
  if (!userHome.trim()) {
    throw new Error('The operating-system home directory is unavailable.');
  }

  const root = join(userHome, '.hush');
  return {
    root,
    config: join(root, 'config.json'),
    uiState: join(root, 'ui-state.json'),
    logs: join(root, 'logs'),
    cache: join(root, 'cache'),
    temporary: join(root, 'tmp'),
  };
}

async function ensureDirectory(path: string): Promise<void> {
  await mkdir(path, { recursive: true, mode: DIRECTORY_MODE });
  const entry = await lstat(path);
  if (!entry.isDirectory() || entry.isSymbolicLink()) {
    throw new Error(`Hush state path is not a regular directory: ${path}`);
  }
  await chmod(path, DIRECTORY_MODE);
}

async function ensureJsonFile(path: string, value: object): Promise<void> {
  try {
    await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, {
      flag: 'wx',
      mode: FILE_MODE,
    });
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'EEXIST') {
      throw error;
    }
  }

  const entry = await lstat(path);
  if (!entry.isFile() || entry.isSymbolicLink()) {
    throw new Error(`Hush state path is not a regular file: ${path}`);
  }
  await chmod(path, FILE_MODE);
}

export async function initializeHushHome(userHome = homedir()): Promise<HushHome> {
  const paths = resolveHushHome(userHome);
  await ensureDirectory(paths.root);
  await Promise.all([
    ensureDirectory(paths.logs),
    ensureDirectory(paths.cache),
    ensureDirectory(paths.temporary),
  ]);
  await Promise.all([
    ensureJsonFile(paths.config, { version: 1 }),
    ensureJsonFile(paths.uiState, { version: 1, activeScreen: 'overview' }),
  ]);
  return paths;
}
