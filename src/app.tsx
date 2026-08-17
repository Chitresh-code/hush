import { caps } from '@termuijs/core';
import {
  useKeymap,
  useMotion,
  useTerminalSize,
} from '@termuijs/jsx';
import { Router } from '@termuijs/router';
import { createStore } from '@termuijs/store';
import { useTheme } from '@termuijs/tss';

export type AppPath = '/' | '/settings';

export interface TerminalCapabilities {
  color: boolean;
  motion: boolean;
  unicode: boolean;
}

interface UiState {
  activePath: AppPath;
}

const useUiState = createStore<UiState>({ activePath: '/' });
const router = new Router({ initialPath: '/' });

router.addRoutes([
  { path: '/', component: OverviewScreen },
  { path: '/settings', component: SettingsScreen },
]);

export function resetUiState(): void {
  router.replace('/');
  useUiState.setState({ activePath: '/' });
}

function navigate(path: AppPath): void {
  router.push(path);
  useUiState.setState({ activePath: path });
}

function OverviewScreen() {
  const theme = useTheme();
  return (
    <box border="single" borderColor={theme.Normal.fg} padding={1} flexGrow={1}>
      <text color={theme.Focus.fg} bold>Local vault</text>
      <text>Your encrypted local workflow will appear here after the Phase 2 security gate.</text>
      <text dim>No secrets are stored by this Phase 1 shell.</text>
    </box>
  );
}

function SettingsScreen() {
  const theme = useTheme();
  return (
    <box border="single" borderColor={theme.Normal.fg} padding={1} flexGrow={1}>
      <text color={theme.Focus.fg} bold>Preferences</text>
      <text>Hush home: ~/.hush</text>
      <text>Theme: terminal environment</text>
    </box>
  );
}

interface HushShellProps {
  columns?: number;
  capabilities?: TerminalCapabilities;
}

export function HushShell({ columns, capabilities }: HushShellProps) {
  const terminal = useTerminalSize();
  const motion = useMotion();
  const theme = useTheme();
  const activePath = useUiState((state) => state.activePath);
  const currentCapabilities = capabilities ?? {
    color: caps.color,
    motion: !motion.reduced,
    unicode: caps.unicode,
  };
  const width = columns ?? terminal.cols;
  const compact = width > 0 && width < 72;
  const mark = currentCapabilities.unicode ? '◆' : '#';
  const divider = currentCapabilities.unicode ? '─' : '-';

  useKeymap([
    { key: '1', action: () => navigate('/'), description: 'Overview' },
    { key: '2', action: () => navigate('/settings'), description: 'Settings' },
    { key: 'left', action: () => navigate('/'), description: 'Previous screen' },
    { key: 'right', action: () => navigate('/settings'), description: 'Next screen' },
  ]);

  const screen = activePath === '/' ? <OverviewScreen /> : <SettingsScreen />;
  const activeLabel = activePath === '/' ? 'Overview' : 'Settings';
  const capabilityLabel = [
    currentCapabilities.color ? 'color' : 'no color',
    currentCapabilities.motion ? 'motion' : 'no motion',
    currentCapabilities.unicode ? 'Unicode' : 'ASCII',
  ].join(' | ');

  return (
    <box
      flexDirection="column"
      width="100%"
      height="100%"
      flexGrow={1}
      padding={compact ? 0 : 1}
      gap={1}
    >
      <text color={theme.Focus.fg} bold>{mark} HUSH  local-first secret management</text>
      <text color={theme.Highlight.fg}>{compact ? `1 Overview | 2 Settings | Active: ${activeLabel}` : `Navigation  1 Overview  2 Settings  Active: ${activeLabel}`}</text>
      <divider char={divider} color={theme.Normal.fg} />
      {screen}
      <text dim>1 overview | 2 settings | arrows navigate | q quit</text>
      <text dim>{capabilityLabel}</text>
    </box>
  );
}

export function HushApp(props: HushShellProps) {
  return <HushShell {...props} />;
}
