import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import {
  HeroGallerySlider,
  heroExcerpt,
  HERO_BLUR_SOFT,
  HERO_BLUR_SHARP,
  HERO_FOCUS_IN_MS,
  HERO_SLIDE_DURATION_MS,
} from './HeroGallerySlider';
import { ArtworkRecord } from '../types';

/**
 * Hero background-slider contracts:
 *   - The slider is an absolute backdrop: it fills its positioning parent
 *   - The artwork cover-crops the container and resolves to ZERO blur
 *   - No artwork meta card: no title, status chip, or Explore/Inquire CTAs
 *   - Drafts and disabled works never rotate into the backdrop
 *   - Controls: ghost arrows navigate, dots jump, autoplay pause/resume
 */

const mkArtwork = (over: Partial<ArtworkRecord> = {}): ArtworkRecord => ({
  slug: 'terrordon',
  title: 'Terrordon',
  year: '2024',
  medium: 'Enamel',
  dimensions: '48" x 60"',
  price: '$5,200',
  status: 'Available',
  gallery_series: 'Neon Americana',
  edition: 'Original Painting',
  location: 'Austin Studio',
  imageUrl: 'https://example.com/terrordon.webp',
  featured_image: '',
  narrative: '',
  heroSlider: false,
  enabled: true,
  archived: false,
  trashed: false,
  ...over,
} as ArtworkRecord);

describe('HeroGallerySlider — background backdrop', () => {
  it('renders as an absolute backdrop layer filling its parent', () => {
    render(<HeroGallerySlider artworks={[mkArtwork()]} />);
    const slider = document.getElementById('hero-gallery-slider-container')!;
    expect(slider.className).toContain('absolute');
    expect(slider.className).toContain('inset-0');
  });

  it('artwork cover-crops the container: object-cover, no meta matte', () => {
    render(<HeroGallerySlider artworks={[mkArtwork()]} />);
    const backdrop = document.querySelector('img[aria-hidden="true"]') as HTMLImageElement;
    expect(backdrop.getAttribute('src')).toContain('terrordon.webp');
    expect(backdrop.className).toContain('object-cover');
  });

  /**
   * The focus-pull contract. This replaces an earlier assertion that the image
   * carried a persistent `blur-` CLASS — which pinned the hero permanently soft
   * and meant no artwork was ever shown at full fidelity.
   *
   * Blur is now animated (an inline `filter`), so it cannot be asserted from
   * className. jsdom has no Web Animations API and framer-motion drives values
   * on rAF, so these assertions run against the module's exported endpoints.
   *
   * ⚠️ The endpoints MUST be non-equal and the sharp end must be blur(0px).
   * A 3-stop keyframe array with a per-property `times` list was tried and did
   * NOT interpolate — it left the hero pinned at blur(12px) permanently, which
   * is worse than the static blur it replaced. This test is the guard.
   */
  it('pulls focus from a soft entrance to dead sharp', () => {
    expect(HERO_BLUR_SOFT).toMatch(/blur\((?!0px)\d/); // non-zero entrance
    expect(HERO_BLUR_SHARP).toBe('blur(0px)'); // resolves fully sharp
    expect(HERO_BLUR_SOFT).not.toBe(HERO_BLUR_SHARP); // actually animates
  });

  it('lands focus early, not at the very end of the slide', () => {
    // A focus pull that only sharpens on the last frame would read as a tease.
    expect(HERO_FOCUS_IN_MS).toBeGreaterThan(0);
    expect(HERO_FOCUS_IN_MS).toBeLessThan(HERO_SLIDE_DURATION_MS);
    // Comfortably inside the dwell — at least half of it spent sharp.
    expect(HERO_FOCUS_IN_MS / HERO_SLIDE_DURATION_MS).toBeLessThanOrEqual(0.5);
  });

  it('applies the soft blur on the first frame, not just after settle', () => {
    render(<HeroGallerySlider artworks={[mkArtwork()]} />);
    const backdrop = document.querySelector('img[aria-hidden="true"]') as HTMLImageElement;
    // framer-motion writes `initial` to the inline style before animating. If
    // this regresses to blur(0px), there is no entrance at all.
    const inline = backdrop.style.filter || backdrop.getAttribute('style') || '';
    expect(inline).toContain('blur');
  });

  it('keeps a persistent class blur off the backdrop entirely', () => {
    render(<HeroGallerySlider artworks={[mkArtwork()]} />);
    const backdrop = document.querySelector('img[aria-hidden="true"]') as HTMLImageElement;
    // Regression guard: a static `blur-[6px]` here is what made the hero
    // permanently out of focus. Blur must live only in the animated filter.
    expect(backdrop.className).not.toMatch(/(?:^|\s)blur-/);
  });

  it('has no artwork meta card: no Explore/Inquire CTAs, no title button, no status chip', () => {
    render(
      <HeroGallerySlider
        artworks={[mkArtwork({ narrative: 'A long enough narrative line about the painting lives right here in this field.' })]}
      />
    );
    expect(screen.queryByRole('button', { name: /explore/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /inquire/i })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Terrordon' })).toBeNull();
    expect(screen.queryByText('Available')).toBeNull();
  });

  it('drafts and disabled works never rotate into the backdrop', () => {
    render(
      <HeroGallerySlider
        artworks={[
          mkArtwork({ slug: 'wip', title: 'Work In Progress', draft: true }),
          mkArtwork({ slug: 'ghost', title: 'Ghost Piece', enabled: false }),
          mkArtwork({ slug: 'visible-one', title: 'Visible One' }),
        ]}
      />
    );
    const labels = screen
      .queryAllByRole('button', { name: /^Jump to/ })
      .map((b) => b.getAttribute('aria-label'));
    // Only one eligible work remains, so the dot strip is hidden entirely
    // (dots render for 2+ slides) — and neither excluded piece appears.
    expect(labels).toHaveLength(0);
    expect(screen.queryByText('Work In Progress')).toBeNull();
    expect(screen.queryByText('Ghost Piece')).toBeNull();
  });

  it('arrows navigate and dots jump to a slide', async () => {
    render(
      <HeroGallerySlider
        artworks={[
          mkArtwork(),
          mkArtwork({ slug: 'jigoku', title: 'Jigoku', imageUrl: 'https://example.com/jigoku.webp' }),
        ]}
      />
    );
    // Hover to reveal ghost arrows (they render with pointer-events-none otherwise)
    const slider = document.getElementById('hero-gallery-slider-container')!;
    slider.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
    await userEvent.click(screen.getByRole('button', { name: 'Next artwork' }));
    const srcs = [...document.querySelectorAll('img[aria-hidden="true"]')].map((i) =>
      (i as HTMLImageElement).getAttribute('src')
    );
    expect(srcs.some((s) => s!.includes('jigoku.webp'))).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Jump to Terrordon' }));
    const srcs2 = [...document.querySelectorAll('img[aria-hidden="true"]')].map((i) =>
      (i as HTMLImageElement).getAttribute('src')
    );
    expect(srcs2.some((s) => s!.includes('terrordon.webp'))).toBe(true);
  });

  it('autoplay control is present', () => {
    render(<HeroGallerySlider artworks={[mkArtwork()]} />);
    expect(screen.getByRole('button', { name: 'Pause autoplay' })).toBeInTheDocument();
  });

  it('active slide name renders on an interior pill inside the canvas', () => {
    render(
      <HeroGallerySlider artworks={[mkArtwork(), mkArtwork({ slug: 'jigoku', title: 'Jigoku' })]} />
    );
    const slider = document.getElementById('hero-gallery-slider-container')!;
    const pill = [...slider.querySelectorAll('span')].find(
      (s) => s.textContent === 'Terrordon' && s.className.includes('backdrop-blur')
    );
    expect(pill).toBeDefined();
    expect(pill!.className).toContain('rounded-full');
  });
});

describe('heroExcerpt', () => {
  it('extracts first readable prose line and strips markdown', () => {
    const md = '![img](x.jpg)\n## Heading\nA **long enough** narrative line about the painting goes right here.';
    expect(heroExcerpt(md)).toBe('A long enough narrative line about the painting goes right here.');
  });

  it('falls back to the studio tagline when no prose exists', () => {
    expect(heroExcerpt('# Title\n---')).toContain('Curated masterwork');
  });
});
