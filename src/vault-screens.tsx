import { useInput } from '@termuijs/jsx';
import { createStore } from '@termuijs/store';
import { activePalette, useUiState } from './ui-state.js';
import type { HushHome } from './hush-home.js';
import { writeLastEnvironmentId } from './hush-home.js';
import { runWithEnv } from './process/run-with-env.js';
import {
  listEnvironmentIds,
  listSecrets,
  listSecretVersions,
  readAllSecrets,
  readSecret,
  rollbackSecret,
  writeSecret,
  type SecretVersionInfo,
  type Vault,
} from './vault/vault.js';

type VaultMode = 'environment' | 'list' | 'add' | 'edit' | 'view' | 'history' | 'run';
type FormField = 'name' | 'value';
type StatusTone = 'info' | 'success' | 'error';

interface VaultUiState {
  environmentId: string;
  mode: VaultMode;
  envDraft: string;
  envPickerIndex: number;
  creatingEnvironment: boolean;
  secretNames: string[];
  selectedIndex: number;
  nameDraft: string;
  valueDraft: string;
  formField: FormField;
  revealed: boolean;
  viewedValue: string | null;
  historyVersions: SecretVersionInfo[];
  historyIndex: number;
  runDraft: string;
  busy: boolean;
  lastExitCode: number | null;
  statusMessage: string | null;
  statusTone: StatusTone;
}

const INITIAL_STATE: VaultUiState = {
  environmentId: '',
  mode: 'environment',
  envDraft: '',
  envPickerIndex: 0,
  creatingEnvironment: false,
  secretNames: [],
  selectedIndex: 0,
  nameDraft: '',
  valueDraft: '',
  formField: 'name',
  revealed: false,
  viewedValue: null,
  historyVersions: [],
  historyIndex: 0,
  runDraft: '',
  busy: false,
  lastExitCode: null,
  statusMessage: null,
  statusTone: 'info',
};

export const useVaultUiState = createStore<VaultUiState>({ ...INITIAL_STATE });

let activeVault: Vault | null = null;
let activeHome: HushHome | null = null;

export function setActiveVault(vault: Vault): void {
  activeVault = vault;
}

export function setActiveHome(home: HushHome): void {
  activeHome = home;
}

// Convenience only: pre-selects the environment the user had open last time
// instead of making them re-pick it from the environment list every launch.
// It is still just an environment id string among others in the picker.
export function setInitialEnvironmentId(environmentId: string | undefined): void {
  if (!environmentId || !activeVault) return;
  if (!listEnvironmentIds(activeVault).includes(environmentId)) return;
  useVaultUiState.setState({ environmentId, mode: 'list' });
  refreshSecretList();
}

export interface VaultSummary {
  environments: string[];
  totalSecrets: number;
  currentEnvironmentId: string;
}

export function getVaultSummary(): VaultSummary | null {
  if (!activeVault) return null;
  const environments = listEnvironmentIds(activeVault);
  const totalSecrets = environments.reduce(
    (sum, environmentId) => sum + listSecrets(activeVault as Vault, environmentId).length,
    0,
  );
  return { environments, totalSecrets, currentEnvironmentId: useVaultUiState.getState().environmentId };
}

export function resetVaultUiState(): void {
  activeVault = null;
  activeHome = null;
  useVaultUiState.setState({ ...INITIAL_STATE });
}

// Free-text vault fields must accept any character, including digits, 't',
// and 'q', the letters the shell's own navigation and quit shortcuts use.
// The shell checks this before acting on those keys so typing a secret never
// silently navigates away or quits the app. The environment picker itself
// isn't typing (arrow keys + enter + n), only its "new environment" text
// entry is.
export function isVaultTyping(): boolean {
  if (useUiState.getState().activePath !== '/vault') return false;
  const state = useVaultUiState.getState();
  if (state.mode === 'environment') return state.creatingEnvironment;
  return state.mode === 'add' || state.mode === 'edit' || state.mode === 'run';
}

function refreshSecretList(): void {
  if (!activeVault) return;
  const environmentId = useVaultUiState.getState().environmentId;
  const secretNames = listSecrets(activeVault, environmentId);
  useVaultUiState.setState((state) => ({
    secretNames,
    selectedIndex: Math.min(state.selectedIndex, Math.max(secretNames.length - 1, 0)),
  }));
}

function isPrintableChar(key: string): boolean {
  return key.length === 1 || key === 'space';
}

function charFor(key: string): string {
  return key === 'space' ? ' ' : key;
}

function setStatus(message: string, tone: StatusTone): void {
  useVaultUiState.setState({ statusMessage: message, statusTone: tone });
}

function persistLastEnvironment(environmentId: string): void {
  if (!activeHome) return;
  writeLastEnvironmentId(activeHome, environmentId).catch(() => {
    setStatus('Could not save last-used environment.', 'error');
  });
}

function selectEnvironment(environmentId: string): void {
  useVaultUiState.setState({
    environmentId,
    mode: 'list',
    creatingEnvironment: false,
    statusMessage: null,
  });
  refreshSecretList();
  persistLastEnvironment(environmentId);
}

function confirmNewEnvironment(): void {
  const environmentId = useVaultUiState.getState().envDraft.trim();
  if (!environmentId) return;
  selectEnvironment(environmentId);
}

function handleEnvironmentInput(key: string): void {
  const state = useVaultUiState.getState();

  if (state.creatingEnvironment) {
    if (key === 'enter') {
      confirmNewEnvironment();
    } else if (key === 'escape') {
      useVaultUiState.setState({ creatingEnvironment: false, envDraft: '' });
    } else if (key === 'backspace') {
      useVaultUiState.setState({ envDraft: state.envDraft.slice(0, -1) });
    } else if (isPrintableChar(key)) {
      useVaultUiState.setState({ envDraft: state.envDraft + charFor(key) });
    }
    return;
  }

  const known = activeVault ? listEnvironmentIds(activeVault) : [];
  if (key === 'up') {
    useVaultUiState.setState({ envPickerIndex: Math.max(state.envPickerIndex - 1, 0) });
  } else if (key === 'down') {
    useVaultUiState.setState({
      envPickerIndex: Math.min(state.envPickerIndex + 1, Math.max(known.length - 1, 0)),
    });
  } else if (key === 'enter') {
    const picked = known[state.envPickerIndex];
    if (picked) selectEnvironment(picked);
  } else if (key === 'n') {
    useVaultUiState.setState({ creatingEnvironment: true, envDraft: '' });
  }
}

function handleListInput(key: string): void {
  const state = useVaultUiState.getState();
  if (key === 'up') {
    useVaultUiState.setState({ selectedIndex: Math.max(state.selectedIndex - 1, 0) });
  } else if (key === 'down') {
    useVaultUiState.setState({
      selectedIndex: Math.min(state.selectedIndex + 1, Math.max(state.secretNames.length - 1, 0)),
    });
  } else if (key === 'a') {
    useVaultUiState.setState({
      mode: 'add',
      nameDraft: '',
      valueDraft: '',
      formField: 'name',
      statusMessage: null,
    });
  } else if (key === 'e') {
    const name = state.secretNames[state.selectedIndex];
    if (!name) return;
    useVaultUiState.setState({
      mode: 'edit',
      nameDraft: name,
      valueDraft: '',
      formField: 'value',
      statusMessage: null,
    });
  } else if (key === 'enter') {
    const name = state.secretNames[state.selectedIndex];
    if (!name || !activeVault) return;
    try {
      const value = readSecret(activeVault, { environmentId: state.environmentId, name });
      useVaultUiState.setState({ mode: 'view', viewedValue: value, revealed: false });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not decrypt secret.', 'error');
    }
  } else if (key === 'r') {
    useVaultUiState.setState({ mode: 'run', runDraft: '', lastExitCode: null });
  } else if (key === 'c') {
    const known = activeVault ? listEnvironmentIds(activeVault) : [];
    const index = Math.max(known.indexOf(state.environmentId), 0);
    useVaultUiState.setState({ mode: 'environment', envPickerIndex: index, creatingEnvironment: false });
  }
}

function handleFormInput(key: string): void {
  const state = useVaultUiState.getState();
  if (key === 'escape') {
    useVaultUiState.setState({ mode: 'list', statusMessage: null });
    return;
  }
  if (key === 'tab' && state.mode === 'add') {
    useVaultUiState.setState({ formField: state.formField === 'name' ? 'value' : 'name' });
    return;
  }
  if (key === 'backspace') {
    if (state.formField === 'name') {
      useVaultUiState.setState({ nameDraft: state.nameDraft.slice(0, -1) });
    } else {
      useVaultUiState.setState({ valueDraft: state.valueDraft.slice(0, -1) });
    }
    return;
  }
  if (key === 'enter') {
    const name = state.mode === 'add' ? state.nameDraft.trim() : state.nameDraft;
    if (!name || !state.valueDraft || !activeVault) return;
    try {
      writeSecret(activeVault, { environmentId: state.environmentId, name }, state.valueDraft);
      useVaultUiState.setState({ mode: 'list' });
      setStatus(`Saved ${name}.`, 'success');
      refreshSecretList();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not save secret.', 'error');
    }
    return;
  }
  if (isPrintableChar(key)) {
    const char = charFor(key);
    if (state.formField === 'name' && state.mode === 'add') {
      useVaultUiState.setState({ nameDraft: state.nameDraft + char });
    } else {
      useVaultUiState.setState({ valueDraft: state.valueDraft + char });
    }
  }
}

function handleViewInput(key: string): void {
  const state = useVaultUiState.getState();
  if (key === 'r') {
    useVaultUiState.setState((current) => ({ revealed: !current.revealed }));
  } else if (key === 'h') {
    const name = state.secretNames[state.selectedIndex];
    if (!name || !activeVault) return;
    const historyVersions = listSecretVersions(activeVault, {
      environmentId: state.environmentId,
      name,
    });
    useVaultUiState.setState({ mode: 'history', historyVersions, historyIndex: 0 });
  } else if (key === 'enter' || key === 'escape') {
    useVaultUiState.setState({ mode: 'list', viewedValue: null, revealed: false });
  }
}

function handleHistoryInput(key: string): void {
  const state = useVaultUiState.getState();
  if (key === 'up') {
    useVaultUiState.setState({ historyIndex: Math.max(state.historyIndex - 1, 0) });
  } else if (key === 'down') {
    useVaultUiState.setState({
      historyIndex: Math.min(state.historyIndex + 1, Math.max(state.historyVersions.length - 1, 0)),
    });
  } else if (key === 'escape') {
    useVaultUiState.setState({ mode: 'view' });
  } else if (key === 'enter') {
    const name = state.secretNames[state.selectedIndex];
    const target = state.historyVersions[state.historyIndex];
    if (!name || !target || !activeVault) return;
    try {
      rollbackSecret(activeVault, { environmentId: state.environmentId, name }, target.version);
      const value = readSecret(activeVault, { environmentId: state.environmentId, name });
      useVaultUiState.setState({ mode: 'view', viewedValue: value, revealed: false });
      setStatus(`Rolled back to version ${target.version}.`, 'success');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not roll back.', 'error');
    }
  }
}

function runCommand(): void {
  const state = useVaultUiState.getState();
  const argv = state.runDraft.trim().split(/\s+/).filter(Boolean);
  if (argv.length === 0 || !activeVault) return;
  useVaultUiState.setState({ busy: true, statusMessage: null });
  const env = readAllSecrets(activeVault, state.environmentId);
  runWithEnv(argv, env)
    .then((code) => {
      useVaultUiState.setState({ busy: false, mode: 'list', lastExitCode: code });
    })
    .catch((error: unknown) => {
      useVaultUiState.setState({ busy: false, mode: 'list' });
      setStatus(error instanceof Error ? error.message : 'Could not run command.', 'error');
    });
}

function handleRunInput(key: string): void {
  const state = useVaultUiState.getState();
  if (state.busy) return;
  if (key === 'escape') {
    useVaultUiState.setState({ mode: 'list' });
  } else if (key === 'backspace') {
    useVaultUiState.setState({ runDraft: state.runDraft.slice(0, -1) });
  } else if (key === 'enter') {
    runCommand();
  } else if (isPrintableChar(key)) {
    useVaultUiState.setState({ runDraft: state.runDraft + charFor(key) });
  }
}

export function VaultScreen() {
  const { palette } = activePalette();
  const state = useVaultUiState();

  useInput((key) => {
    switch (state.mode) {
      case 'environment':
        handleEnvironmentInput(key);
        break;
      case 'list':
        handleListInput(key);
        break;
      case 'add':
      case 'edit':
        handleFormInput(key);
        break;
      case 'view':
        handleViewInput(key);
        break;
      case 'history':
        handleHistoryInput(key);
        break;
      case 'run':
        handleRunInput(key);
        break;
    }
  });

  const statusColor =
    state.statusTone === 'error' ? palette.error : state.statusTone === 'success' ? palette.success : palette.secondary;

  return (
    <box border="single" borderColor={palette.border} padding={1} flexGrow={1} flexDirection="column" gap={1}>
      {renderMode(state, palette)}
      {state.statusMessage ? <text color={statusColor}>{state.statusMessage}</text> : null}
    </box>
  );
}

function renderMode(state: VaultUiState, palette: ReturnType<typeof activePalette>['palette']) {
  if (state.mode === 'environment') {
    if (state.creatingEnvironment) {
      return [
        <text color={palette.primary} bold>New environment</text>,
        <text>Name: {state.envDraft}_</text>,
        <text dim>enter confirm  esc cancel</text>,
      ];
    }
    const known = activeVault ? listEnvironmentIds(activeVault) : [];
    return [
      <text color={palette.primary} bold>Environments</text>,
      known.length === 0
        ? <text dim>None yet. Press n to create one.</text>
        : known.map((id, index) =>
            index === state.envPickerIndex
              ? <text color={palette.primary}>{'› ' + id}</text>
              : <text>{'  ' + id}</text>,
          ),
      <text dim>↑/↓ choose  enter select  n new environment</text>,
    ];
  }

  if (state.mode === 'view') {
    const shown = state.revealed ? (state.viewedValue ?? '') : '•'.repeat((state.viewedValue ?? '').length);
    return [
      <text color={palette.primary} bold>{state.secretNames[state.selectedIndex]}</text>,
      <text>{shown}</text>,
      <text dim>r reveal/mask  h history  enter/esc back</text>,
    ];
  }

  if (state.mode === 'history') {
    return [
      <text color={palette.primary} bold>History: {state.secretNames[state.selectedIndex]}</text>,
      state.historyVersions.length === 0
        ? <text dim>No versions.</text>
        : state.historyVersions.map((entry, index) =>
            index === state.historyIndex
              ? <text color={palette.primary}>{`› v${entry.version}  ${entry.createdAt}`}</text>
              : <text dim>{`  v${entry.version}  ${entry.createdAt}`}</text>,
          ),
      <text dim>↑/↓ choose  enter roll back  esc back</text>,
    ];
  }

  if (state.mode === 'add' || state.mode === 'edit') {
    const maskedValue = '•'.repeat(state.valueDraft.length);
    return [
      <text color={palette.primary} bold>{state.mode === 'add' ? 'Add secret' : `Edit ${state.nameDraft}`}</text>,
      state.mode === 'add'
        ? <text>Name{state.formField === 'name' ? '>' : ' '} {state.nameDraft}{state.formField === 'name' ? '_' : ''}</text>
        : null,
      <text>Value{state.formField === 'value' ? '>' : ' '} {maskedValue}{state.formField === 'value' ? '_' : ''}</text>,
      <text dim>{state.mode === 'add' ? 'tab switch field  ' : ''}enter save  esc cancel</text>,
    ];
  }

  if (state.mode === 'run') {
    return [
      <text color={palette.primary} bold>Run with {state.environmentId} injected</text>,
      <text>Command: {state.runDraft}_</text>,
      state.busy ? <text dim>Running…</text> : <text dim>enter run  esc cancel</text>,
    ];
  }

  return [
    <text color={palette.primary} bold>{state.environmentId}</text>,
    state.secretNames.length === 0
      ? <text dim>No secrets yet.</text>
      : state.secretNames.map((name, index) =>
          index === state.selectedIndex
            ? <text color={palette.primary}>{'› ' + name}</text>
            : <text>{'  ' + name}</text>,
        ),
    state.lastExitCode !== null
      ? <text color={state.lastExitCode === 0 ? palette.success : palette.error}>Last run exit code: {state.lastExitCode}</text>
      : null,
    <text dim>a add  enter view  e edit  r run  c change environment</text>,
  ];
}
