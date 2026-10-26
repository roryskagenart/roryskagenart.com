import type { ArtworkRecord } from '../types';

/** Row shape returned by `GET /api/taxonomies` (`public.taxonomies`). */
export interface TaxonomyTerm {
  id: string;
  type: string;
  slug: string;
  name: string;
  sort_order: number;
}

/**
 * The option sets the artwork editor's dropdowns are built from.
 *
 * `series` / `medium` / `location` are curated taxonomy terms plus whatever the
 * catalog already holds; `edition` has no taxonomy type, so it is derived from
 * the data plus the two values the studio actually uses.
 */
export interface ArtworkOptionSets {
  series: string[];
  medium: string[];
  location: string[];
  edition: string[];
}

/** Values the server falls back to on create (`server/routes/artworks.ts`). */
export const DEFAULT_EDITIONS = ['Original Painting', 'Original Artwork'];

type ArtworkValueFields = Pick<ArtworkRecord, 'gallery_series' | 'medium' | 'location' | 'edition'>;

const clean = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/**
 * Merge curated taxonomy terms with the values already present in the catalog.
 *
 * WHY THE MERGE: the editor previously derived its series list from
 * `artworks.gallery_series` alone, so a term created on the Taxonomies page did
 * not appear until some artwork already used it — the dropdown looked dead. The
 * reverse hole matters just as much: `Pop Surrealism & Folklore` is on 18 works
 * but is not a taxonomy term, and a taxonomy-only list would make that value
 * unreachable.
 *
 * Ordering is deliberate: taxonomy terms keep their curated `sort_order` (the
 * studio's ordering, which also drives the public filter), then catalog-only
 * values follow alphabetically so nothing jumps around between loads.
 */
export function buildArtworkOptionSets(
  terms: TaxonomyTerm[],
  artworks: ArtworkValueFields[]
): ArtworkOptionSets {
  const termNames = (type: string): string[] =>
    terms
      .filter((term) => term?.type === type)
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name))
      .map((term) => clean(term.name))
      .filter(Boolean);

  const usedValues = (pick: (artwork: ArtworkValueFields) => string | undefined): string[] =>
    artworks.map((artwork) => clean(pick(artwork))).filter(Boolean);

  const merge = (curated: string[], used: string[]): string[] => {
    const seen = new Set(curated);
    const extras = Array.from(new Set(used.filter((value) => !seen.has(value)))).sort((a, b) =>
      a.localeCompare(b)
    );
    return [...curated, ...extras];
  };

  return {
    series: merge(termNames('series'), usedValues((a) => a.gallery_series)),
    medium: merge(termNames('medium'), usedValues((a) => a.medium)),
    location: merge(termNames('location'), usedValues((a) => a.location)),
    edition: merge(DEFAULT_EDITIONS, usedValues((a) => a.edition)),
  };
}

/**
 * The series a brand-new work should start on: the one the catalog uses most,
 * so "New artwork" does not silently pick an arbitrary curated term. Falls back
 * to the first option, then to an empty string.
 */
export function defaultSeriesFor(options: string[], artworks: ArtworkValueFields[]): string {
  const counts = new Map<string, number>();
  for (const artwork of artworks) {
    const series = clean(artwork.gallery_series);
    if (!series) continue;
    counts.set(series, (counts.get(series) || 0) + 1);
  }
  let best = '';
  let bestCount = 0;
  for (const [series, count] of counts) {
    if (count > bestCount || (count === bestCount && series.localeCompare(best) < 0)) {
      best = series;
      bestCount = count;
    }
  }
  return best || options[0] || '';
}
