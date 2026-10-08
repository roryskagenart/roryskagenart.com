import { resolveAssetUrl } from './assetResolver';
import { getArtworkSvg } from './artAssets';

/**
 * Content and image resolution shared by the home page sections.
 *
 * Extracted from `HomeLandingView.tsx` because the page was split into a presentation shell plus
 * this data module during the gallery-first rewrite — the view is now large enough that mixing
 * copy, constants and the asset-resolution chain in one file made both harder to read.
 *
 * The resolution chain itself is deliberately unchanged (v3.2 dual-read): Supabase asset registry
 * first, frozen legacy map second, generated SVG last. It is the only path a public page may use —
 * never a hard-coded `/images/...` string for catalogue art.
 */
export const resolveImageUrl = (key: string, slug?: string): string => {
  const url = resolveAssetUrl(key, slug, 'hero');
  if (url) return url;
  return getArtworkSvg(slug || key.replace(/\.[^/.]+$/, ''));
};

/**
 * The "Greetings from Austin" mural in three eras — today, roadside nostalgia, and painting day.
 *
 * This is the page's provenance anchor: the single most photographed wall in Austin, by the same
 * hand that is selling the panels above it. The first two frames are real photographs; the third
 * is the studio's own 1998 installation shot.
 *
 * NOTE: `greetings-mural-painting-1998.jpg` and `greetings-from-austin-mural.jpg` are served from
 * `public/images/`. A newer `(Medium)` variant also exists on disk — swap the `src` here once it
 * has been reviewed, rather than adding a second entry.
 */
export const LANDMARK_TRIPTYCH = [
  {
    src: '/images/greetings-from-austin-mural.jpg',
    alt: 'Visitor posing in front of the Greetings from Austin mural at Roadhouse Relics',
    era: 'The landmark today',
    caption: 'South 1st & Annie Street — photographed by millions of travelers since 1998.',
    tag: 'Espy 2024',
  },
  {
    src: '/images/greetings-mural-turquoise-truck.jpg',
    alt: 'Vintage turquoise Chevrolet Apache pickup parked in front of the Greetings from Austin mural',
    era: 'Roadside Americana',
    caption: 'Roadhouse Relics gallery with a 1957 Apache — vintage neon signs & decor for homes.',
    tag: 'The gallery years',
  },
  {
    src: '/images/greetings-mural-painting-1998.jpg',
    alt: 'Rory Skagen painting the Greetings from Austin mural in 1998 with ladder and paint supplies',
    era: 'Painting day, 1998',
    caption: 'Skagen at the wall — hand-lettering the large-letter postcard that became an Austin icon.',
    tag: 'Original installation',
  },
];

/**
 * The four beats the page tells the studio's story with. Kept as data so the copy can be reviewed
 * and corrected without touching layout, and so a future "about" page can share the same spine.
 */
export const STUDIO_TIMELINE = [
  {
    year: '1985',
    title: 'The studio opens',
    body: 'Skagen starts painting in Austin — sign enamel, steel panels and the roadside vernacular that still drives every canvas.',
  },
  {
    year: '1998',
    title: 'A landmark is painted',
    body: 'The "Greetings from Austin" mural goes up at South 1st. It becomes the most photographed wall in the city.',
  },
  {
    year: '2004',
    title: 'SouthPop founded',
    body: 'Co-founds the South Austin Popular Culture Center, preserving the music and poster art history of Central Texas.',
  },
  {
    year: 'Today',
    title: 'Sold from the studio',
    body: 'Original paintings, enamels on panel and commissions — sold directly by the artist who made them.',
  },
];
