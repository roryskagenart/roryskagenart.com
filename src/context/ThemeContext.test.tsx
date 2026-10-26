import React from 'react';
import { readFileSync } from 'fs';
import path from 'path';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ThemeProvider, useTheme } from './ThemeContext';

/**
 * Theme default contract.
 *
 * Light is the studio default for both the public site and the admin app. A
 * saved preference still wins — the default is only what an *unset* visitor
 * gets. `index.html`'s no-flash boot script mirrors this rule in vanilla JS and
 * cannot be imported here, so it is pinned by reading the source below.
 */

const Probe: React.FC = () => {
  const { theme, isDark, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="isDark">{String(isDark)}</span>
      <button onClick={toggleTheme}>toggle</button>
    </div>
  );
};

const renderProbe = () =>
  render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>
  );

describe('ThemeProvider default', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    document.body.className = '';
    document.documentElement.style.colorScheme = '';
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('defaults to light when nothing is saved', () => {
    renderProbe();
    expect(screen.getByTestId('theme').textContent).toBe('light');
    expect(screen.getByTestId('isDark').textContent).toBe('false');
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('honours a saved dark preference', () => {
    localStorage.setItem('rory_studio_theme', 'dark');
    renderProbe();
    expect(screen.getByTestId('theme').textContent).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('light')).toBe(false);
  });

  it('honours a saved light preference', () => {
    localStorage.setItem('rory_studio_theme', 'light');
    renderProbe();
    expect(screen.getByTestId('theme').textContent).toBe('light');
  });

  it('persists a toggle, so a dark choice survives the next load', () => {
    renderProbe();
    act(() => screen.getByRole('button', { name: /toggle/i }).click());
    expect(screen.getByTestId('theme').textContent).toBe('dark');
    expect(localStorage.getItem('rory_studio_theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});

describe('the no-flash boot script in index.html', () => {
  /**
   * The boot script runs before the bundle and is the only thing that decides
   * the first paint. If it disagreed with `ThemeContext`, every load would flash
   * the wrong theme — the exact bug the script exists to prevent.
   */
  const html = () => readFileSync(path.resolve(__dirname, '../../index.html'), 'utf8');

  it('starts light, not dark', () => {
    const source = html();
    expect(source).toMatch(/<html lang="en" class="light h-full">/);
    expect(source).toContain("var mode = 'light';");
    expect(source).toContain("localStorage.getItem('rory_studio_theme') === 'dark' ? 'dark' : 'light'");
  });

  it('keeps a dark pre-palette gate so a dark visitor never sees a light flash', () => {
    const source = html();
    expect(source).toMatch(/html\.palette-booting\.dark[^{]*\{[^}]*#17171b/);
  });
});
