import { NAMED_THEMES, tokyoNightTheme } from '@termuijs/tss';
import { Router } from '@termuijs/router';
import { createStore } from '@termuijs/store';

export type AppPath = '/' | '/settings' | '/vault';

const THEME_NAMES = ['tokyoNight', 'dracula', 'catppuccin', 'nord'] as const;
export type ThemeName = (typeof THEME_NAMES)[number];

export const THEME_LABELS: Record<ThemeName, string> = {
  tokyoNight: 'Tokyo Night',
  dracula: 'Dracula',
  catppuccin: 'Catppuccin',
  nord: 'Nord',
};

interface UiState {
  activePath: AppPath;
  themeIndex: number;
}

export const useUiState = createStore<UiState>({ activePath: '/', themeIndex: 0 });
export const router = new Router({ initialPath: '/' });

export function resetUiState(): void {
  router.replace('/');
  useUiState.setState({ activePath: '/', themeIndex: 0 });
}

export function navigate(path: AppPath): void {
  router.push(path);
  useUiState.setState({ activePath: path });
}

export function cycleTheme(): void {
  useUiState.setState((state) => ({
    themeIndex: (state.themeIndex + 1) % THEME_NAMES.length,
  }));
}

export function activePalette() {
  const themeIndex = useUiState((state) => state.themeIndex);
  const themeName = THEME_NAMES[themeIndex] ?? THEME_NAMES[0];
  return { palette: NAMED_THEMES[themeName] ?? tokyoNightTheme, themeName };
}
