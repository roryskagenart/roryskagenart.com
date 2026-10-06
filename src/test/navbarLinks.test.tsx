/**
 * Pins the public navbar's contract after the icon/compaction pass.
 *
 * WHY THIS EXISTS
 * The navbar is the studio's only cross-site door: it must link the Fourthwall storefront
 * (shop.roryskagenart.com) as a REAL anchor, never as a hash-router button — `navigateTo`
 * resolves `#shop` to no route and would silently render nothing. The same pass replaced
 * "Home" and "Dashboard" with icon-only buttons to buy horizontal room; that only stays
 * accessible if each icon carries its label as aria-label AND title. This suite reads the
 * rendered DOM so a future edit that drops one fails loudly.
 *
 * No network, no tokens: renders the component with mocked context hooks.
 */
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Navbar } from '../components/Navbar';

// Hoisted mutable so a test can flip authentication before rendering.
const authState = vi.hoisted(() => ({ isAuthenticated: false }));

vi.mock('../context/ThemeContext', () => ({
  useTheme: () => ({ toggleTheme: vi.fn(), isDark: false }),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => authState,
}));

afterEach(() => {
  cleanup();
  authState.isAuthenticated = false;
});

function renderNavbar(currentRoute = 'home') {
  const onNavigate = vi.fn();
  render(<Navbar currentRoute={currentRoute} onNavigate={onNavigate} />);
  return { onNavigate };
}

describe('navbar links', () => {
  it('links the Fourthwall storefront as a real anchor with rel=noopener', () => {
    renderNavbar();
    const shop = screen.getByRole('link', { name: 'Shop' });
    expect(shop).toHaveAttribute('href', 'https://shop.roryskagenart.com');
    expect(shop).toHaveAttribute('rel', 'noopener noreferrer');
    // External target: opening in a new tab keeps the gallery session intact.
    expect(shop).toHaveAttribute('target', '_blank');
  });

  it('renders Home as an icon-only button that stays keyboard/AT accessible', () => {
    renderNavbar();
    // Icon-only: the visible text "Home" must be gone from the desktop nav…
    const home = screen.getByRole('button', { name: 'Home' });
    expect(home).toHaveTextContent(''); // no label text — the icon IS the control
    expect(home).toHaveAttribute('aria-label', 'Home');
    expect(home).toHaveAttribute('title', 'Home');
  });

  it('renders Dashboard as an icon-only button with its label preserved for AT', () => {
    authState.isAuthenticated = true;
    renderNavbar();
    const dashboard = screen.getByRole('button', { name: 'Dashboard' });
    expect(dashboard).toHaveTextContent('');
    expect(dashboard).toHaveAttribute('aria-label', 'Dashboard');
    expect(dashboard).toHaveAttribute('title', 'Dashboard');
  });

  it('hides Dashboard from unauthenticated visitors', () => {
    renderNavbar();
    expect(screen.queryByRole('button', { name: 'Dashboard' })).not.toBeInTheDocument();
  });

  it('shortens Contact Me to Contact', () => {
    renderNavbar();
    expect(screen.getByRole('button', { name: 'Contact' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Contact Me' })).not.toBeInTheDocument();
  });

  it('routes internal links through onNavigate, not window.location', () => {
    const { onNavigate } = renderNavbar('home');
    screen.getByRole('button', { name: 'Contact' }).click();
    expect(onNavigate).toHaveBeenCalledWith('contact');
  });
});
