import { caps, parseColor } from '@termuijs/core';
import {
  useKeymap,
  useMotion,
  useTerminalSize,
  type FC,
} from '@termuijs/jsx';
import { Router } from '@termuijs/router';
import { createStore } from '@termuijs/store';
import { NAMED_THEMES, tokyoNightTheme } from '@termuijs/tss';
import { BigText } from '@termuijs/widgets';

export type AppPath = '/' | '/settings';

export interface TerminalCapabilities {
  color: boolean;
  motion: boolean;
  unicode: boolean;
}

const THEME_NAMES = ['tokyoNight', 'dracula', 'catppuccin', 'nord'] as const;
type ThemeName = (typeof THEME_NAMES)[number];

const THEME_LABELS: Record<ThemeName, string> = {
  tokyoNight: 'Tokyo Night',
  dracula: 'Dracula',
  catppuccin: 'Catppuccin',
  nord: 'Nord',
};

interface UiState {
  activePath: AppPath;
  themeIndex: number;
}

const useUiState = createStore<UiState>({ activePath: '/', themeIndex: 0 });
const router = new Router({ initialPath: '/' });

router.addRoutes([
  { path: '/', component: OverviewScreen },
  { path: '/settings', component: SettingsScreen },
]);

export function resetUiState(): void {
  router.replace('/');
  useUiState.setState({ activePath: '/', themeIndex: 0 });
}

function navigate(path: AppPath): void {
  router.push(path);
  useUiState.setState({ activePath: path });
}

function cycleTheme(): void {
  useUiState.setState((state) => ({
    themeIndex: (state.themeIndex + 1) % THEME_NAMES.length,
  }));
}

function activePalette() {
  const themeIndex = useUiState((state) => state.themeIndex);
  const themeName = THEME_NAMES[themeIndex] ?? THEME_NAMES[0];
  return { palette: NAMED_THEMES[themeName] ?? tokyoNightTheme, themeName };
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
  return (
    <box border="single" borderColor={palette.border} padding={1} flexGrow={1}>
      <text color={palette.primary} bold>Local vault</text>
      <text>This is where your secrets will live, encrypted on this device.</text>
      <text dim>Nothing is stored yet.</text>
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

  useKeymap([
    { key: '1', action: () => navigate('/'), description: 'Overview' },
    { key: '2', action: () => navigate('/settings'), description: 'Settings' },
    { key: 'left', action: () => navigate('/'), description: 'Previous screen' },
    { key: 'right', action: () => navigate('/settings'), description: 'Next screen' },
    { key: 't', action: cycleTheme, description: 'Theme' },
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
      {showBanner
        ? [
            <Banner text="HUSH" color={palette.primary} />,
            <text color={palette.muted}>v{version}  ·  local vault  ·  press t for theme</text>,
          ]
        : (
          <text color={palette.primary} bold>{mark} HUSH  local-first secret management</text>
        )}
      <text color={palette.secondary}>{compact ? `1 Overview | 2 Settings | Active: ${activeLabel}` : `Navigation  1 Overview  2 Settings  Active: ${activeLabel}`}</text>
      <divider char={divider} color={palette.border} />
      {screen}
      <text dim>1 overview | 2 settings | t theme | arrows navigate | q quit</text>
      <text dim>{capabilityLabel}</text>
    </box>
  );
}

export function HushApp(props: HushShellProps) {
  return <HushShell {...props} />;
}
