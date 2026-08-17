import { caps, parseColor } from '@termuijs/core';
import {
  getCurrentApp,
  useKeymap,
  useMotion,
  useTerminalSize,
  type FC,
} from '@termuijs/jsx';
import { BigText } from '@termuijs/widgets';
import { getVaultSummary, isVaultTyping, VaultScreen } from './vault-screens.js';
import {
  activePalette,
  cycleTheme,
  navigate,
  resetUiState,
  THEME_LABELS,
  useUiState,
  type AppPath,
} from './ui-state.js';

export type { AppPath };
export { resetUiState };

export interface TerminalCapabilities {
  color: boolean;
  motion: boolean;
  unicode: boolean;
}

const BIG_TEXT_CHAR_WIDTH = 4; // BigText draws 3-column glyphs plus a 1-column gap
const BIG_TEXT_CHAR_HEIGHT = 5;

const Banner: FC<{ text: string; color: string }> = ({ text, color }) =>
  new BigText(
    text,
    { width: text.length * BIG_TEXT_CHAR_WIDTH - 1, height: BIG_TEXT_CHAR_HEIGHT },
    { color: parseColor(color) },
  );

function OverviewScreen() {
  const { palette } = activePalette();
  const summary = getVaultSummary();

  if (!summary || summary.environments.length === 0) {
    return (
      <box border="single" borderColor={palette.border} padding={1} flexGrow={1} flexDirection="column" gap={1}>
        <text color={palette.primary} bold>Local vault</text>
        <text>Everything you add is encrypted on this device. Nothing leaves it.</text>
        <text dim>No environments yet. Press 3, then n, to create your first one.</text>
      </box>
    );
  }

  return (
    <box border="single" borderColor={palette.border} padding={1} flexGrow={1} flexDirection="column" gap={1}>
      <text color={palette.primary} bold>Local vault</text>
      <row gap={1}>
        <text color={palette.secondary}>Environments</text>
        <text bold>{summary.environments.length}</text>
      </row>
      <row gap={1}>
        <text color={palette.secondary}>Secrets stored</text>
        <text bold>{summary.totalSecrets}</text>
      </row>
      {summary.currentEnvironmentId ? (
        <row gap={1}>
          <text color={palette.secondary}>Open environment</text>
          <text color={palette.success} bold>{summary.currentEnvironmentId}</text>
        </row>
      ) : null}
      <text dim>{summary.environments.join(', ')}</text>
      <text dim>Press 3 to open the vault.</text>
    </box>
  );
}

function SettingsScreen() {
  const { palette, themeName } = activePalette();
  return (
    <box border="single" borderColor={palette.border} padding={1} flexGrow={1}>
      <text color={palette.primary} bold>Preferences</text>
      <text>Hush home: ~/.hush</text>
      <text>Theme: {THEME_LABELS[themeName]}  (press t to change)</text>
      <text dim>Platform: macOS</text>
    </box>
  );
}

const SCREEN_ORDER: AppPath[] = ['/', '/settings', '/vault'];

function adjacentScreen(current: AppPath, delta: 1 | -1): AppPath {
  const index = SCREEN_ORDER.indexOf(current);
  const nextIndex = (index + delta + SCREEN_ORDER.length) % SCREEN_ORDER.length;
  return SCREEN_ORDER[nextIndex] ?? '/';
}

interface HushShellProps {
  columns?: number;
  capabilities?: TerminalCapabilities;
  version?: string;
}

export function HushShell({ columns, capabilities, version = 'dev' }: HushShellProps) {
  const terminal = useTerminalSize();
  const motion = useMotion();
  const activePath = useUiState((state) => state.activePath);
  const { palette } = activePalette();
  const currentCapabilities = capabilities ?? {
    color: caps.color,
    motion: !motion.reduced,
    unicode: caps.unicode,
  };
  const width = columns ?? terminal.cols;
  const compact = width > 0 && width < 72;
  const mark = currentCapabilities.unicode ? '◆' : '#';
  const divider = currentCapabilities.unicode ? '─' : '-';
  const showBanner = currentCapabilities.unicode && !compact;

  // Vault text-entry fields must accept any character, including the
  // letters these shortcuts use ('t', 'q') and digits, so every shell-level
  // shortcut is a no-op while a vault screen is capturing free text. Ctrl+C
  // still force-quits unconditionally; that's a framework-level control
  // chord, not something a user types as part of a secret.
  useKeymap([
    { key: '1', action: () => !isVaultTyping() && navigate('/'), description: 'Overview' },
    { key: '2', action: () => !isVaultTyping() && navigate('/settings'), description: 'Settings' },
    { key: '3', action: () => !isVaultTyping() && navigate('/vault'), description: 'Vault' },
    {
      key: 'left',
      action: () => !isVaultTyping() && navigate(adjacentScreen(useUiState.getState().activePath, -1)),
      description: 'Previous screen',
    },
    {
      key: 'right',
      action: () => !isVaultTyping() && navigate(adjacentScreen(useUiState.getState().activePath, 1)),
      description: 'Next screen',
    },
    { key: 't', action: () => !isVaultTyping() && cycleTheme(), description: 'Theme' },
    { key: 'q', action: () => !isVaultTyping() && getCurrentApp()?.exit(), description: 'Quit' },
  ]);

  const screen =
    activePath === '/' ? <OverviewScreen /> : activePath === '/settings' ? <SettingsScreen /> : <VaultScreen />;
  const activeLabel = activePath === '/' ? 'Overview' : activePath === '/settings' ? 'Settings' : 'Vault';
  const { themeName } = activePalette();
  const capabilityLabel = [
    THEME_LABELS[themeName],
    currentCapabilities.color ? 'color' : 'no color',
    currentCapabilities.motion ? 'motion' : 'no motion',
    currentCapabilities.unicode ? 'Unicode' : 'ASCII',
  ].join(' · ');
  const commandLabel = compact
    ? '1 Overview  2 Settings  3 Vault  q Quit'
    : '1 Overview  2 Settings  3 Vault  t Theme  ←/→ Navigate  q Quit';

  return (
    <box
      flexDirection="column"
      width="100%"
      height="100%"
      flexGrow={1}
      padding={compact ? 0 : 1}
      gap={1}
    >
      {showBanner
        ? [
            <Banner text="HUSH" color={palette.primary} />,
            <text color={palette.muted}>v{version}  ·  local vault</text>,
          ]
        : (
          <text color={palette.primary} bold>{mark} HUSH  local-first secret management</text>
        )}
      <text color={palette.secondary}>Hush › {activeLabel}</text>
      <divider char={divider} color={palette.border} />
      {screen}
      <text dim>{commandLabel}</text>
      <text dim>{capabilityLabel}</text>
    </box>
  );
}

export function HushApp(props: HushShellProps) {
  return <HushShell {...props} />;
}
