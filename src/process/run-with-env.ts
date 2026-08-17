import { spawn } from 'node:child_process';
import { getCurrentApp } from '@termuijs/jsx';

// TermUI's own useSubprocess hook (suspend raw mode, spawn with inherited
// stdio, restore raw mode) has no way to pass an env object, so this mirrors
// it directly rather than routing secrets through process.env. cmd is always
// an argv array, never a shell string, so secret values in env can't be
// reinterpreted as shell syntax.
export function runWithEnv(cmd: string[], env: Record<string, string>): Promise<number> {
  if (cmd.length === 0) {
    throw new Error('runWithEnv requires a command');
  }
  const [command, ...args] = cmd as [string, ...string[]];
  const app = getCurrentApp();
  app?.terminal.exitRawMode();

  return new Promise<number>((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: 'inherit',
      env: { ...process.env, ...env },
    });
    proc.on('close', (code) => resolve(code ?? 0));
    proc.on('error', reject);
  }).finally(() => {
    app?.terminal.enterRawMode();
    app?.screen.invalidate();
    app?.requestRender();
  });
}
