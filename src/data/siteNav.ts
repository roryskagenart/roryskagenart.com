import { Facebook, Instagram, X as XIcon } from 'lucide-react';
import type { ComponentType } from 'react';

/**
 * The studio site's cross-site navigation vocabulary.
 *
 * WHY THIS IS A MODULE, NOT INLINE DATA
 * The public studio site (`roryskagenart.com`) and the storefront (`shop.roryskagenart.com`) are
 * separate deployments with no shared component tree — but they are one studio to a visitor, and
 * their headers must read as one design. This file is the studio side's half of that contract, and
 * it is exported so `Navbar.test.tsx` can assert against the same source the header renders from
 * instead of hard-coded strings that drift.
 *
 * The rules encoded here are not cosmetic:
 *  - `external` marks a link the in-app hash router CANNOT resolve. `navigateTo('shop')` finds no
 *    route and renders nothing, so external entries must render as real `<a href>` elements.
 *  - `accent` is the one filled pill in the rail. It marks the section you are IN — on the studio
 *    site that is Studio (this app); on the storefront the same slot carries Shop.
 *
 * ORDER: Studio · Shop · Archive · About · Contact. Studio leads because this is the studio site —
 * the visitor arrived at the artist, not at the storefront — and Archive follows Shop so the two
 * ways of looking at work (buy it / study it) sit next to each other.
 */

export const SHOP_ORIGIN = 'https://shop.roryskagenart.com';

/**
 * The studio's public origin, used for cross-site links pointing back at this app from the
 * storefront context. Kept here so the storefront's own nav config can mirror it.
 */
export const STUDIO_ORIGIN = 'https://roryskagenart.com';

export interface SocialLink {
  id: string;
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
}

export const SOCIAL_LINKS: SocialLink[] = [
  {
    id: 'instagram',
    label: 'Instagram',
    href: 'https://www.instagram.com/roryskagenart/',
    icon: Instagram,
  },
  {
    id: 'facebook',
    label: 'Facebook',
    href: 'https://www.facebook.com/profile.php?id=61595115680897',
    icon: Facebook,
  },
  {
    id: 'x',
    label: 'X',
    href: 'https://x.com/roryskagen',
    icon: XIcon,
  },
];

export interface SiteNavLink {
  id: string;
  label: string;
  /** Leaves the app — render as `<a href>`, never through `onNavigate`. */
  external?: boolean;
  /** Absolute URL for external links; the in-app route id for internal ones. */
  href?: string;
  /** The single filled pill in the rail. */
  accent?: boolean;
}

export const STUDIO_NAV: SiteNavLink[] = [
  {
    id: 'studio',
    label: 'Studio',
    accent: true,
  },
  {
    id: 'shop',
    label: 'Shop',
    external: true,
    href: SHOP_ORIGIN,
  },
  {
    id: 'catalog',
    label: 'Archive',
  },
  {
    id: 'about',
    label: 'About',
    external: true,
    href: `${STUDIO_ORIGIN}/#about`,
  },
  {
    id: 'contact',
    label: 'Contact',
    external: true,
    href: `${STUDIO_ORIGIN}/#contact`,
  },
];
