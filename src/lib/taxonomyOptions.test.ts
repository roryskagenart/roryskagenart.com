import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EDITIONS,
  buildArtworkOptionSets,
  defaultSeriesFor,
  type TaxonomyTerm,
} from './taxonomyOptions';

/**
 * The artwork editor's dropdowns are only as good as this merge.
 *
 * The shipped defect: series options came from `artworks.gallery_series` alone,
 * so a term created on the Taxonomies page never appeared in the editor until
 * some artwork already used it. The opposite hole is just as real — values in the
 * catalog that are *not* taxonomy terms would vanish from a taxonomy-only list.
 * Both directions are pinned here.
 */

const term = (type: string, name: string, sort_order = 0): TaxonomyTerm => ({
  id: `${type}-${name}`,
  type,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  name,
  sort_order,
});

const artwork = (over: Record<string, string | undefined> = {}) => ({
  gallery_series: 'Neon Americana',
  medium: 'Acrylic',
  location: 'Austin, TX',
  edition: 'Original Painting',
  ...over,
});

describe('buildArtworkOptionSets', () => {
  it('offers curated taxonomy terms even when no artwork uses them yet', () => {
    const sets = buildArtworkOptionSets(
      [term('series', 'Kaiju Invasion Nation'), term('series', 'Neon Americana')],
      [artwork()]
    );
    expect(sets.series).toEqual(['Kaiju Invasion Nation', 'Neon Americana']);
  });

  it('keeps catalog-only values so existing data stays selectable', () => {
    const sets = buildArtworkOptionSets(
      [term('series', 'Neon Americana')],
      [artwork({ gallery_series: 'Pop Surrealism & Folklore' })]
    );
    expect(sets.series).toContain('Pop Surrealism & Folklore');
  });

  it('orders curated terms by sort_order then name, extras alphabetically after them', () => {
    const sets = buildArtworkOptionSets(
      [term('series', 'Zeta', 2), term('series', 'Alpha', 0), term('series', 'Beta', 0)],
      [artwork({ gallery_series: 'Yankee' }), artwork({ gallery_series: 'Aardvark' })]
    );
    expect(sets.series).toEqual(['Alpha', 'Beta', 'Zeta', 'Aardvark', 'Yankee']);
  });

  it('de-duplicates a value that is both a term and in use, and drops blanks', () => {
    const sets = buildArtworkOptionSets(
      [term('series', 'Neon Americana'), term('series', '  ')],
      [artwork(), artwork(), artwork({ gallery_series: '' }), artwork({ gallery_series: undefined })]
    );
    expect(sets.series).toEqual(['Neon Americana']);
  });

  it('scopes each field to its own taxonomy type', () => {
    const sets = buildArtworkOptionSets(
      [term('series', 'Suave Sessions'), term('medium', 'Murals'), term('location', 'Studio')],
      []
    );
    expect(sets.series).toEqual(['Suave Sessions']);
    expect(sets.medium).toEqual(['Murals']);
    expect(sets.location).toEqual(['Studio']);
  });

  it('seeds editions from the studio defaults because no edition taxonomy exists', () => {
    const sets = buildArtworkOptionSets([], [artwork({ edition: 'Monoprint' })]);
    expect(sets.edition).toEqual([...DEFAULT_EDITIONS, 'Monoprint']);
  });
});

describe('defaultSeriesFor', () => {
  it('picks the series the catalog uses most, not the first curated term', () => {
    const options = ['Kaiju Invasion Nation', 'Neon Americana'];
    const works = [
      artwork({ gallery_series: 'Kaiju Invasion Nation' }),
      artwork({ gallery_series: 'Neon Americana' }),
      artwork({ gallery_series: 'Neon Americana' }),
    ];
    expect(defaultSeriesFor(options, works)).toBe('Neon Americana');
  });

  it('falls back to the first option when the catalog is empty', () => {
    expect(defaultSeriesFor(['Neon Americana', 'Kaiju Invasion Nation'], [])).toBe('Neon Americana');
  });

  it('falls back to an empty string when there is nothing to offer', () => {
    expect(defaultSeriesFor([], [artwork({ gallery_series: '' })])).toBe('');
  });
});
