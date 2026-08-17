/** @jsxImportSource @termuijs/jsx */

import { afterEach, describe, expect, it } from 'vitest';
import { computeLayout, renderFallback, Screen } from '@termuijs/core';
import { reconcile } from '@termuijs/jsx';
import { render } from '@termuijs/testing';
import { Box } from '@termuijs/widgets';
import { HushApp, resetUiState } from '../src/app.js';

afterEach(() => resetUiState());

describe('Hush application shell', () => {
  it('occupies the real TermUI layout and renders visible content', () => {
    const root = new Box({ flexDirection: 'column', width: '100%', height: '100%' });
    root.addChild(reconcile(<HushApp columns={80} />));
    computeLayout(root.getLayoutNode(), 80, 24);
    root.syncLayout();
    const screen = new Screen(80, 24);
    root.render(screen);

    expect(renderFallback(screen)).toContain('HUSH');
  });

  it('navigates with visible keyboard actions', () => {
    const screen = render(<HushApp columns={100} />);

    expect(screen.getByText('Local vault')).not.toBeNull();
    expect(screen.getByText('Navigation')).not.toBeNull();

    screen.fireKey('2');

    expect(screen.getByText('Preferences')).not.toBeNull();
    expect(screen.getByText('Active: Settings')).not.toBeNull();
    screen.unmount();
  });

  it('uses a compact ASCII presentation when capabilities require it', () => {
    const screen = render(
      <HushApp
        columns={60}
        capabilities={{ color: false, motion: false, unicode: false }}
      />,
      { width: 60 },
    );
    const output = screen.renderToString();

    expect(output).toContain('# HUSH');
    expect(output).toContain('1 Overview | 2 Settings | Active: Overview');
    expect(output).toContain('no color | no motion | ASCII');
    expect(output).not.toContain('◆');
    screen.unmount();
  });
});
