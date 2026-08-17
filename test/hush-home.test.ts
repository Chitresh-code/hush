import { lstat, mkdtemp, mkdir, readFile, stat, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { initializeHushHome, resolveHushHome } from '../src/hush-home.js';

const createdHomes: string[] = [];

async function temporaryHome(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), 'hush-test-'));
  createdHomes.push(path);
  return path;
}

afterEach(async () => {
  const { rm } = await import('node:fs/promises');
  await Promise.all(createdHomes.splice(0).map((path) => rm(path, { recursive: true })));
});

describe('Hush home', () => {
  it('creates only non-secret state below the user home with private permissions', async () => {
    const userHome = await temporaryHome();
    const paths = await initializeHushHome(userHome);

    expect(paths).toEqual(resolveHushHome(userHome));
    await expect(lstat(join(process.cwd(), '.hush'))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(lstat(join(paths.root, 'hush.db'))).rejects.toMatchObject({ code: 'ENOENT' });
    expect(JSON.parse(await readFile(paths.config, 'utf8'))).toEqual({ version: 1 });
    expect((await stat(paths.root)).mode & 0o777).toBe(0o700);
    expect((await stat(paths.config)).mode & 0o777).toBe(0o600);
  });

  it('rejects a symbolic-link state directory', async () => {
    const userHome = await temporaryHome();
    const target = join(userHome, 'target');
    await mkdir(target);
    await symlink(target, join(userHome, '.hush'));

    await expect(initializeHushHome(userHome)).rejects.toThrow('not a regular directory');
  });
});
