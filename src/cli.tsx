#!/usr/bin/env node

import { render } from '@termuijs/jsx';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { HushApp } from './app.js';
import { initializeHushHome } from './hush-home.js';

const HELP = `Usage: hush

Launch the Hush terminal interface.

Options:
  -h, --help  Show this help message
`;

export function assertSupportedPlatform(platform = process.platform): void {
  if (platform !== 'darwin') {
    throw new Error('Hush Phase 1 supports macOS only.');
  }
}

export async function runCli(args = process.argv.slice(2)): Promise<number> {
  if (args.includes('--help') || args.includes('-h')) {
    process.stdout.write(HELP);
    return 0;
  }
  if (args.length > 0) {
    throw new Error(`Unknown option: ${args[0]}`);
  }

  assertSupportedPlatform();
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Hush requires an interactive terminal.');
  }

  await initializeHushHome();
  return render(<HushApp />, { title: 'Hush', fullscreen: true, exitKey: 'q' });
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;

  try {
    return realpathSync(entry) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

if (isMainModule()) {
  runCli()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unexpected startup failure.';
      process.stderr.write(`hush: ${message}\n`);
      process.exitCode = 1;
    });
}
