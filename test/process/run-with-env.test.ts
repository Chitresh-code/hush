import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runWithEnv } from '../../src/process/run-with-env.js';

const createdDirs: string[] = [];

async function tempOutputFile(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'hush-run-env-test-'));
  createdDirs.push(dir);
  return join(dir, 'out.txt');
}

afterEach(async () => {
  await Promise.all(createdDirs.splice(0).map((dir) => rm(dir, { recursive: true })));
});

describe('runWithEnv', () => {
  it('injects env values into the child without a shell', async () => {
    const outFile = await tempOutputFile();
    const code = await runWithEnv(
      [
        process.execPath,
        '-e',
        'require("fs").writeFileSync(process.argv[1], process.env.HUSH_TEST_SECRET ?? "")',
        outFile,
      ],
      { HUSH_TEST_SECRET: 'super-secret-value' },
    );

    expect(code).toBe(0);
    expect(await readFile(outFile, 'utf8')).toBe('super-secret-value');
  });

  it('resolves with the child exit code', async () => {
    const code = await runWithEnv([process.execPath, '-e', 'process.exit(3)'], {});
    expect(code).toBe(3);
  });

  it('rejects when the command cannot be spawned', async () => {
    await expect(runWithEnv(['hush-nonexistent-binary-xyz'], {})).rejects.toThrow();
  });

  it('rejects an empty command', () => {
    expect(() => runWithEnv([], {})).toThrow('requires a command');
  });
});
