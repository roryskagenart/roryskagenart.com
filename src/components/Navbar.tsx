import React, { useState } from 'react';
import {
  ChevronDown,
  LayoutDashboard,
  Menu,
  Moon,
  Search,
  ShoppingBag,
  Sun,
  X,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { SHOP_ORIGIN, STUDIO_NAV, SOCIAL_LINKS } from '../data/siteNav';
import type { SiteNavLink } from '../data/siteNav';

interface NavbarProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
}

/**
 * Public header — one shared vocabulary with the Fourthwall storefront (shop.roryskagenart.com).
 *
 * The two sites are separate deployments, so there is no component to share; the contract is the
 * *shape* of the header, mirrored here:
 *
 *   Tier 1  brand lockup · nav list · social links · cart
 *   Tier 2  the active section's own links, on a hairline rail
 *
 * `siteNav.ts` holds that vocabulary so this component and its test read the same source.
 *
 * Two rules this file exists to protect:
 *  - Cross-site links (Shop, About, Contact, the socials) are REAL anchors. The in-app router
 *    resolves `#shop` to no route and silently renders nothing, so anything leaving this app must
 *    never be routed through `onNavigate`.
 *  - In-app links (Studio, Catalog, an artwork) must go through `onNavigate` — it is what clears a
 *    stale `/artwork/<slug>` pathname (see App.tsx `navigateTo`).
 */
export const Navbar: React.FC<NavbarProps> = ({ currentRoute, onNavigate }) => {
  const { toggleTheme, isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isGallerySection =
    currentRoute === 'gallery' ||
    currentRoute === 'catalog' ||
    currentRoute.startsWith('artwork');

  const handleNavClick = (id: string) => {
    onNavigate(id);
    setMobileMenuOpen(false);
  };

  const isLinkActive = (link: SiteNavLink): boolean => {
    if (link.id === 'catalog') return isGallerySection;
    // Studio is HOME — this app. Every route that is not the archive reads as "Studio", which is
    // why it also lights up on the home view itself.
    if (link.id === 'studio') {
      return (
        !isGallerySection &&
        currentRoute !== 'about' &&
        currentRoute !== 'contact' &&
        currentRoute !== 'pages'
      );
    }
    return false;
  };

  /**
   * Typography lives on the element that renders the label, not on the containing `<ul>`.
   *
   * WHY: `text-transform` and `letter-spacing` are inherited, but Tailwind's preflight resets
   * `text-transform: none` on form controls — so a `<button>` nav item silently drops the
   * `uppercase` its parent `<ul>` set, while an `<a>` sibling keeps it. That produced a rail where
   * Studio and Archive rendered title-case next to an uppercase SHOP/ABOUT/CONTACT. Carrying the
   * classes here makes the two render paths visually identical whatever element they use.
   *
   * The accent pill takes precedence over the active state: when the current section is the accent
   * entry (Studio on the studio site), the filled pill IS the active indicator — stacking an
   * underline on top of it would double up.
   */
  const linkClasses = (active: boolean, accent: boolean) => {
    const shared = 'uppercase tracking-[0.14em]';
    if (accent) {
      return `${shared} rounded-full bg-amber-500 px-3.5 py-1.5 font-bold text-black hover:opacity-90`;
    }
    return `${shared} px-2 py-1.5 transition-colors ${
      active ? 'text-foreground font-black' : 'text-muted-foreground hover:text-foreground'
    }`;
  };

  return (
    <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-line-strong transition-colors shadow-xs">
      {/* ─────────────────────────────────────────────────────────────
          TIER 1 — brand lockup · nav · socials · cart
      ────────────────────────────────────────────────────────────────*/}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 sm:h-[74px] sm:flex-nowrap sm:gap-x-4 sm:py-0">
          {/* 1. BRAND LOCKUP (left) */}
          <button
            onClick={() => handleNavClick('home')}
            className="group flex flex-none items-center gap-2.5 text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-line-strong rounded-sm"
            aria-label="Rory Skagen Art — home"
          >
            <span className="flex h-9 w-9 flex-none items-center justify-center overflow-hidden rounded-lg border border-line bg-background transition-transform group-hover:scale-105">
              <img src="/android-chrome-192x192.png" alt="" className="h-full w-full object-cover" />
            </span>
            <span className="flex flex-col justify-center">
              <span className="font-serif text-[13px] font-black uppercase leading-tight tracking-[0.18em] text-foreground transition-colors group-hover:underline group-hover:decoration-2 group-hover:underline-offset-4 sm:text-sm">
                Rory Skagen Art
              </span>
              <span className="hidden font-mono text-[9px] uppercase leading-tight tracking-[0.22em] text-muted-foreground sm:block">
                Austin, Texas • Est. 1985
              </span>
            </span>
          </button>

          {/* 2. PRIMARY NAV LIST — pill on the desktop rail, row 2 on mobile */}
          <ul className="no-scrollbar order-last flex w-full items-center gap-x-1 overflow-x-auto font-mono text-[11px] font-bold sm:order-none sm:ml-auto sm:w-auto sm:justify-end sm:gap-x-2 sm:text-xs">
            {STUDIO_NAV.map((link) => {
              const active = isLinkActive(link);

              if (link.external && link.href) {
                return (
                  <li key={link.id} className="flex-none">
                    <a
                      href={link.href}
                      rel="noopener noreferrer"
                      className={`flex items-center whitespace-nowrap ${linkClasses(active, !!link.accent)}`}
                    >
                      {link.label}
                    </a>
                  </li>
                );
              }

              return (
                <li key={link.id} className="flex-none">
                  <button
                    onClick={() => handleNavClick(link.id)}
                    aria-current={active && !link.accent ? 'page' : undefined}
                    className={`flex cursor-pointer items-center whitespace-nowrap ${linkClasses(active, !!link.accent)}`}
                  >
                    {link.label}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* 3. RIGHT UTILITIES — socials, cart, search, theme */}
          <div className="ml-auto flex flex-none items-center gap-1.5 sm:ml-0 sm:gap-3">
            <ul className="hidden items-center gap-1 lg:flex">
              {SOCIAL_LINKS.map((social) => (
                <li key={social.id}>
                  <a
                    href={social.href}
                    aria-label={social.label}
                    title={social.label}
                    rel="me noopener noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-strong"
                  >
                    <social.icon className="h-[15px] w-[15px]" />
                  </a>
                </li>
              ))}
            </ul>

            {/* Cart — the bag lives on the storefront, so this is a hand-off, not a drawer. */}
            <a
              href={`${SHOP_ORIGIN}/cart`}
              rel="noopener noreferrer"
              aria-label="Cart — opens the storefront"
              title="Cart — opens the storefront"
              className="relative flex h-10 w-10 items-center justify-center rounded-md border border-line text-foreground transition-colors hover:bg-surface"
            >
              <ShoppingBag className="h-4 w-4" />
            </a>

            <button
              onClick={() => handleNavClick('gallery')}
              aria-label="Browse the catalogue"
              title="Browse the catalogue"
              className="hidden h-10 w-10 cursor-pointer items-center justify-center rounded-md border border-line text-foreground transition-colors hover:bg-surface sm:flex"
            >
              <Search className="h-4 w-4" />
            </button>

            <button
              onClick={toggleTheme}
              title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
              aria-label="Toggle theme"
              className="hidden h-10 w-10 cursor-pointer items-center justify-center rounded-md border border-line text-foreground transition-colors hover:bg-surface sm:flex"
            >
              {isDark ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-foreground/80" />
              )}
            </button>

            {isAuthenticated && (
              <button
                onClick={() => handleNavClick('/admin')}
                aria-label="Dashboard"
                title="Dashboard"
                className="hidden h-10 w-10 cursor-pointer items-center justify-center rounded-md border border-line text-foreground transition-colors hover:bg-surface sm:flex"
              >
                <LayoutDashboard className="h-4 w-4" />
              </button>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-md bg-primary text-primary-foreground focus:outline-none sm:hidden"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TIER 2 — sub-nav rail. Tabs of the section you are in, plus its
          escape hatch. Only the gallery has one so far.
      ────────────────────────────────────────────────────────────────*/}
      {isGallerySection && (
        <div className="border-t border-line">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="no-scrollbar flex items-center gap-2 overflow-x-auto py-2.5 font-mono text-[11px] sm:h-11 sm:py-0">
              <span className="hidden flex-none font-bold uppercase tracking-[0.16em] text-muted-foreground sm:inline">
                Archive
              </span>
              <span className="hidden flex-none text-line-strong sm:inline" aria-hidden="true">
                —
              </span>
              <div className="flex flex-1 items-center gap-1">
                {GALLERY_TABS.map((tab) => (
                  <a
                    key={tab.id}
                    href={tab.href}
                    className="flex flex-none items-center whitespace-nowrap rounded-full px-3 py-1 uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                  >
                    {tab.label}
                  </a>
                ))}
              </div>
              <button
                onClick={() => handleNavClick('gallery')}
                className="flex flex-none cursor-pointer items-center gap-1 rounded-full border border-line px-3 py-1 font-bold uppercase tracking-[0.16em] text-foreground transition-colors hover:bg-surface"
              >
                View all
                <ChevronDown className="h-3 w-3 -rotate-90" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MOBILE DROPDOWN
      ────────────────────────────────────────────────────────────────*/}
      {mobileMenuOpen && (
        <div className="border-t border-line py-4 font-mono text-xs sm:hidden animate-in slide-in-from-top-2 duration-200">
          <div className="max-w-7xl mx-auto px-4 space-y-2">
            {STUDIO_NAV.map((link) => {
              const active = isLinkActive(link);

              if (link.external && link.href) {
                return (
                  <a
                    key={link.id}
                    href={link.href}
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-between rounded-xs px-3 py-2.5 uppercase tracking-wider text-foreground/80 transition-colors hover:bg-muted"
                  >
                    <span>{link.label}</span>
                    <span className="text-[10px]">↗</span>
                  </a>
                );
              }

              return (
                <button
                  key={link.id}
                  onClick={() => handleNavClick(link.id)}
                  className={`flex w-full cursor-pointer items-center justify-between rounded-xs px-3 py-2.5 uppercase tracking-wider transition-colors ${
                    active ? 'bg-primary font-bold text-primary-foreground' : 'text-foreground/80 hover:bg-muted'
                  }`}
                >
                  <span>{link.label}</span>
                  {active && <span className="text-[10px]">●</span>}
                </button>
              );
            })}

            <div className="flex items-center gap-2 pt-2">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.id}
                  href={social.href}
                  aria-label={social.label}
                  rel="me noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
              <button
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="ml-auto flex h-9 cursor-pointer items-center gap-2 rounded-md border border-line px-3 text-foreground"
              >
                {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
                <span>{isDark ? 'Light' : 'Dark'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

/**
 * The gallery's own sub-nav. These are filter *deep links* into the studio catalogue, not real
 * storefront collections — the storefront keeps its own four. Declared here rather than in
 * `siteNav.ts` because they are a property of this rail, not of the cross-site vocabulary.
 */
const GALLERY_TABS = [
  { id: 'all', label: 'The goods', href: '#catalog' },
  { id: 'wall-art', label: 'Wall art', href: '#catalog' },
  { id: 'editions', label: 'Studio editions', href: '#catalog' },
  { id: 'originals', label: 'Original artwork', href: '#catalog' },
];
