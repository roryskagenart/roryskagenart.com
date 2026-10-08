/**
 * Pins the public navbar's contract after the shop-parity pass.
 *
 * WHY THIS EXISTS
 * The navbar is the studio's only cross-site door, and the two sites it joins — this app and the
 * Fourthwall storefront — are separate deployments with no shared component tree. The header shape
 * is therefore a *contract*, held in `src/data/siteNav.ts` and asserted here against the rendered
 * DOM so a future edit cannot quietly break it.
 *
 * The failure this suite is built to catch: a cross-site link wired through the hash router.
 * `navigateTo('shop')` resolves to no route and renders NOTHING — a dead link that still looks
 * clickable. Every outbound entry must therefore be a real `<a href>`.
 *
 * No network, no tokens: renders the component with mocked context hooks.
 */
import { cleanup, render, screen, within } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Navbar } from '../components/Navbar';
import { SHOP_ORIGIN, SOCIAL_LINKS, STUDIO_NAV } from '../data/siteNav';

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

describe('navbar — storefront hand-off', () => {
  it('links the storefront as a real anchor, never through the hash router', () => {
    const { onNavigate } = renderNavbar();
    const shop = screen.getByRole('link', { name: 'Shop' });
    expect(shop).toHaveAttribute('href', SHOP_ORIGIN);
    expect(shop).toHaveAttribute('rel', 'noopener noreferrer');
    // The storefront is same-site; navigating away in-place is the intended behaviour.
    expect(shop).not.toHaveAttribute('target', '_blank');
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('sends the cart affordance to the storefront cart route', () => {
    renderNavbar();
    const cart = screen.getByRole('link', { name: /cart/i });
    expect(cart).toHaveAttribute('href', `${SHOP_ORIGIN}/cart`);
  });

  it('renders every external nav entry as an anchor with an absolute href', () => {
    renderNavbar();
    for (const link of STUDIO_NAV.filter((l) => l.external)) {
      const el = screen.getByRole('link', { name: link.label });
      expect(el).toHaveAttribute('href', link.href);
      expect(el.getAttribute('href')).toMatch(/^https:\/\//);
    }
  });

  it('renders each social profile with rel=me and an accessible name', () => {
    renderNavbar();
    for (const social of SOCIAL_LINKS) {
      const el = screen.getByRole('link', { name: social.label });
      expect(el).toHaveAttribute('href', social.href);
      expect(el).toHaveAttribute('rel', 'me noopener noreferrer');
    }
  });
});

describe('navbar — in-app routing', () => {
  it('routes the Archive entry through onNavigate', () => {
    const { onNavigate } = renderNavbar('home');
    screen.getByRole('button', { name: 'Archive' }).click();
    expect(onNavigate).toHaveBeenCalledWith('catalog');
  });

  it('routes Studio through onNavigate', () => {
    const { onNavigate } = renderNavbar('home');
    screen.getByRole('button', { name: 'Studio' }).click();
    expect(onNavigate).toHaveBeenCalledWith('studio');
  });

  it('makes Studio the accent pill, and the pill replaces aria-current', () => {
    renderNavbar('home');
    const studio = screen.getByRole('button', { name: 'Studio' });
    expect(studio.className).toMatch(/bg-amber-500/);
    // The filled pill IS the "you are here" signal — no underline, so no aria-current either.
    expect(studio).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Shop' }).className).not.toMatch(/bg-amber-500/);
  });

  it('marks Archive current while the gallery route is active', () => {
    renderNavbar('gallery');
    expect(screen.getByRole('button', { name: 'Archive' })).toHaveAttribute('aria-current', 'page');
  });

  it('orders the rail Studio · Shop · Archive · About · Contact', () => {
    renderNavbar('home');
    const labels = STUDIO_NAV.map((l) => l.label);
    expect(labels).toEqual(['Studio', 'Shop', 'Archive', 'About', 'Contact']);
  });

  /**
   * Every label must carry `uppercase` ON THE ELEMENT, not inherit it from the <ul>.
   *
   * Regression guard for a real bug: Tailwind's preflight resets `text-transform: none` on form
   * controls, so `<button>` items (Studio, Archive) dropped the uppercase their parent `<ul>` set
   * while the `<a>` items (Shop, About, Contact) kept it. The rail rendered as
   * "Studio  SHOP  Archive  ABOUT  CONTACT" — mixed case, looking like a typo.
   */
  it('uppercases every label on the element itself, for anchors and buttons alike', () => {
    renderNavbar('home');
    const labels = screen.getAllByText(/^(Studio|Shop|Archive|About|Contact)$/);
    expect(labels.length).toBeGreaterThanOrEqual(STUDIO_NAV.length);
    for (const el of labels) {
      expect(el.className).toMatch(/uppercase/);
    }
  });
});

describe('navbar — gallery sub-nav rail', () => {
  it('shows the rail only while a gallery route is active', () => {
    renderNavbar('home');
    expect(screen.queryByRole('button', { name: /view all/i })).not.toBeInTheDocument();

    cleanup();
    renderNavbar('gallery');
    expect(screen.getByRole('button', { name: /view all/i })).toBeInTheDocument();
  });

  it('treats an artwork dossier as part of the gallery section', () => {
    renderNavbar('artwork/kirunam');
    expect(screen.getByRole('button', { name: /view all/i })).toBeInTheDocument();
  });
});

describe('navbar — studio dashboard', () => {
  it('hides Dashboard from unauthenticated visitors', () => {
    renderNavbar();
    expect(screen.queryByRole('button', { name: 'Dashboard' })).not.toBeInTheDocument();
  });

  it('shows Dashboard with its label preserved for assistive tech when signed in', () => {
    authState.isAuthenticated = true;
    renderNavbar();
    const dashboard = screen.getByRole('button', { name: 'Dashboard' });
    expect(dashboard).toHaveAttribute('aria-label', 'Dashboard');
    expect(dashboard).toHaveAttribute('title', 'Dashboard');
  });
});

describe('navbar — brand lockup', () => {
  it('renders the wordmark with the studio heritage line', () => {
    renderNavbar();
    const brand = screen.getByRole('button', { name: /home$/i });
    expect(within(brand).getByText('Rory Skagen Art')).toBeInTheDocument();
    expect(within(brand).getByText(/Austin, Texas • Est\. 1985/)).toBeInTheDocument();
  });
});
