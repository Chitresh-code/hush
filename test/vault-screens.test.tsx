/** @jsxImportSource @termuijs/jsx */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { render } from '@termuijs/testing';
import { HushApp, resetUiState } from '../src/app.js';
import { initializeHushHome } from '../src/hush-home.js';
import { lockVault, openVault, type Vault } from '../src/vault/vault.js';
import { resetVaultUiState, setActiveHome, setActiveVault } from '../src/vault-screens.js';
import { InMemoryKeyringEntry } from './fixtures/keyring-double.js';

const createdHomes: string[] = [];
let vault: Vault | undefined;

async function setUpVault() {
  const userHome = await mkdtemp(join(tmpdir(), 'hush-vault-screen-test-'));
  createdHomes.push(userHome);
  const home = await initializeHushHome(userHome);
  vault = await openVault(home, new InMemoryKeyringEntry());
  setActiveVault(vault);
  setActiveHome(home);
  return { home, vault };
}

function addEnvironment(screen: ReturnType<typeof render>, environmentId: string) {
  screen.fireKey('n');
  screen.typeText(environmentId);
  screen.fireKey('enter');
}

afterEach(async () => {
  resetUiState();
  resetVaultUiState();
  if (vault) lockVault(vault);
  vault = undefined;
  await Promise.all(createdHomes.splice(0).map((dir) => rm(dir, { recursive: true })));
});

describe('vault screens', () => {
  it('selects an environment, adds a secret, and views it masked then revealed', async () => {
    await setUpVault();
    const screen = render(<HushApp columns={100} />);

    screen.fireKey('3');
    expect(screen.getByText('Environments')).not.toBeNull();
    expect(screen.getByText('None yet. Press n to create one.')).not.toBeNull();

    addEnvironment(screen, 'acme/prod');
    expect(screen.getByText('acme/prod')).not.toBeNull();
    expect(screen.getByText('No secrets yet.')).not.toBeNull();

    screen.fireKey('a');
    screen.typeText('API_KEY');
    screen.fireKey('tab');
    screen.typeText('sekrit');
    screen.fireKey('enter');
    expect(screen.getByText('Saved API_KEY.')).not.toBeNull();
    expect(screen.getByText('API_KEY')).not.toBeNull();

    screen.fireKey('enter');
    expect(screen.getByText('••••••')).not.toBeNull();
    expect(screen.queryByText('sekrit')).toBeNull();

    screen.fireKey('r');
    expect(screen.getByText('sekrit')).not.toBeNull();

    screen.unmount();
  });

  it('lists an existing environment in the picker instead of losing it on retype', async () => {
    await setUpVault();
    const screen = render(<HushApp columns={100} />);

    screen.fireKey('3');
    addEnvironment(screen, 'acme/prod');
    screen.fireKey('a');
    screen.typeText('API_KEY');
    screen.fireKey('tab');
    screen.typeText('sekrit');
    screen.fireKey('enter');

    // Switch away, then back. The picker must show acme/prod as a
    // selectable entry, not require retyping it from scratch.
    screen.fireKey('c');
    expect(screen.getByText('acme/prod')).not.toBeNull();
    screen.fireKey('enter');
    expect(screen.getByText('acme/prod')).not.toBeNull();
    expect(screen.getByText('API_KEY')).not.toBeNull();

    screen.unmount();
  });

  it('writes a new version through the edit form and preserves history for rollback', async () => {
    const { vault: v } = await setUpVault();
    const screen = render(<HushApp columns={100} />);

    screen.fireKey('3');
    addEnvironment(screen, 'acme/prod');
    screen.fireKey('a');
    screen.typeText('API_KEY');
    screen.fireKey('tab');
    screen.typeText('first');
    screen.fireKey('enter');

    screen.fireKey('e');
    screen.typeText('second');
    screen.fireKey('enter');
    expect(screen.getByText('Saved API_KEY.')).not.toBeNull();

    screen.fireKey('enter');
    screen.fireKey('r');
    expect(screen.getByText('second')).not.toBeNull();

    expect(v.db.prepare('SELECT COUNT(*) AS n FROM secrets').get()).toEqual({ n: 2 });

    screen.fireKey('h');
    expect(screen.getByText('v2')).not.toBeNull();
    expect(screen.getByText('v1')).not.toBeNull();
    screen.fireKey('down');
    screen.fireKey('enter');
    expect(screen.getByText('Rolled back to version 1.')).not.toBeNull();

    screen.fireKey('r');
    expect(screen.getByText('first')).not.toBeNull();
    expect(v.db.prepare('SELECT COUNT(*) AS n FROM secrets').get()).toEqual({ n: 3 });

    screen.unmount();
  });

  it('does not let shell shortcuts fire while typing a secret value', async () => {
    await setUpVault();
    const screen = render(<HushApp columns={100} />);

    screen.fireKey('3');
    addEnvironment(screen, 'acme/prod');
    screen.fireKey('a');
    screen.typeText('API_KEY');
    screen.fireKey('tab');
    // 't' and 'q' are shell shortcuts (theme, quit) but must land in the
    // value field here, since a real secret can contain either letter.
    screen.typeText('to-quit-or-not');
    screen.fireKey('enter');

    expect(screen.getByText('Saved API_KEY.')).not.toBeNull();
    screen.fireKey('enter');
    screen.fireKey('r');
    expect(screen.getByText('to-quit-or-not')).not.toBeNull();

    screen.unmount();
  });

  it('shows real vault stats on the overview screen instead of a placeholder', async () => {
    await setUpVault();
    const screen = render(<HushApp columns={100} />);

    screen.fireKey('3');
    addEnvironment(screen, 'acme/prod');
    screen.fireKey('a');
    screen.typeText('API_KEY');
    screen.fireKey('tab');
    screen.typeText('sekrit');
    screen.fireKey('enter');

    screen.fireKey('1');
    expect(screen.getByText('Environments')).not.toBeNull();
    expect(screen.getByText('1')).not.toBeNull();
    expect(screen.getByText('Secrets stored')).not.toBeNull();
    expect(screen.getByText('acme/prod')).not.toBeNull();
    expect(screen.queryByText('No environments yet. Press 3, then n, to create your first one.')).toBeNull();

    screen.unmount();
  });

  it('runs a command with the environment injected and reports the exit code', async () => {
    const runDir = await mkdtemp(join(tmpdir(), 'hush-run-'));
    createdHomes.push(runDir);
    const outFile = join(runDir, 'out.txt');
    await setUpVault();
    const screen = render(<HushApp columns={100} />);

    screen.fireKey('3');
    addEnvironment(screen, 'acme/prod');
    screen.fireKey('a');
    screen.typeText('OUT_MARKER');
    screen.fireKey('tab');
    screen.typeText('injected-value');
    screen.fireKey('enter');

    screen.fireKey('r');
    expect(screen.getByText('Run with acme/prod injected')).not.toBeNull();
    screen.typeText(
      `${process.execPath} -e require("fs").writeFileSync("${outFile}",process.env.OUT_MARKER||"") ${outFile}`,
    );
    screen.fireKey('enter');

    await screen.waitFor(() => {
      expect(screen.getByText('Last run exit code: 0')).not.toBeNull();
    });

    screen.unmount();
  });
});
