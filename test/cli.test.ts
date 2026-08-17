import { describe, expect, it } from 'vitest';
import { assertSupportedPlatform, runCli } from '../src/cli.js';

describe('CLI platform boundary', () => {
  it('rejects unsupported operating systems explicitly', () => {
    expect(() => assertSupportedPlatform('linux')).toThrow('supports macOS only');
  });

  it('accepts macOS', () => {
    expect(() => assertSupportedPlatform('darwin')).not.toThrow();
  });

  it('rejects unknown options before starting the terminal', async () => {
    await expect(runCli(['--unknown'])).rejects.toThrow('Unknown option: --unknown');
  });
});
