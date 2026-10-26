import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ArtworkEditDialog } from './ArtworkEditDialog';
import { ArtworkRecord } from '../../types';

/**
 * Dropdown wiring for the artwork editor.
 *
 * The bug: series options were derived from `artworks.gallery_series` alone, so
 * a term created on the Taxonomies page never reached the editor — the dropdown
 * looked dead. `medium`, `location` and `edition` were plain text inputs with no
 * suggestions at all.
 *
 * These tests pin the contract at the component boundary: whatever option lists
 * the caller passes are what the controls offer, and a record whose stored value
 * is outside those lists still displays it (instead of rendering blank and
 * silently dropping the value on the next save).
 */

const mkArtwork = (over: Partial<ArtworkRecord> = {}): ArtworkRecord =>
  ({
    slug: 'kaiju-1',
    title: 'Kaiju Study',
    year: '2026',
    medium: 'Acrylic',
    dimensions: '24" x 36"',
    price: '',
    status: 'Available',
    gallery_series: 'Neon Americana',
    edition: 'Original Painting',
    location: 'Austin Studio',
    imageUrl: '',
    featured_image: '',
    narrative: '',
    heroSlider: false,
    enabled: true,
    draft: false,
    archived: false,
    trashed: false,
    ...over,
  }) as ArtworkRecord;

const renderDialog = (props: Partial<React.ComponentProps<typeof ArtworkEditDialog>> = {}) =>
  render(
    <ArtworkEditDialog
      open
      artwork={mkArtwork()}
      seriesOptions={['Kaiju Invasion Nation', 'Neon Americana']}
      onClose={vi.fn()}
      onSave={vi.fn().mockResolvedValue({ success: true })}
      {...props}
    />
  );

describe('artwork editor dropdowns', () => {
  it('offers every series the caller supplies, including unused taxonomy terms', () => {
    renderDialog();
    const select = screen.getByLabelText(/gallery series/i) as HTMLSelectElement;
    const values = Array.from(select.options).map((option) => option.value);
    expect(values).toContain('Kaiju Invasion Nation');
    expect(values).toContain('Neon Americana');
  });

  it('selects the stored series', () => {
    renderDialog();
    const select = screen.getByLabelText(/gallery series/i) as HTMLSelectElement;
    expect(select.value).toBe('Neon Americana');
  });

  it('keeps a stored series that is not in the option list selectable', () => {
    // Real data does this: `Pop Surrealism & Folklore` is on 18 works and is not
    // a taxonomy term. Dropping it from the list would blank the field and the
    // next save would overwrite it.
    renderDialog({ artwork: mkArtwork({ gallery_series: 'Pop Surrealism & Folklore' }) });
    const select = screen.getByLabelText(/gallery series/i) as HTMLSelectElement;
    expect(Array.from(select.options).map((option) => option.value)).toContain(
      'Pop Surrealism & Folklore'
    );
    expect(select.value).toBe('Pop Surrealism & Folklore');
  });

  it('suggests the medium, location and edition values it is given', () => {
    renderDialog({
      mediumOptions: ['Acrylic', 'Enamel', 'Murals'],
      locationOptions: ['Austin, TX', 'Studio'],
      editionOptions: ['Original Painting', 'Monoprint'],
    });

    for (const [label, expected] of [
      [/^medium$/i, 'Murals'],
      [/^location$/i, 'Studio'],
      [/^edition$/i, 'Monoprint'],
    ] as const) {
      const input = screen.getByLabelText(label) as HTMLInputElement;
      const listId = input.getAttribute('list');
      expect(listId, `${label} has no datalist`).toBeTruthy();
      const options = Array.from(
        document.getElementById(listId!)?.querySelectorAll('option') || []
      ).map((option) => option.getAttribute('value'));
      expect(options).toContain(expected);
    }
  });

  it('still accepts a free-text medium, because the column is not a foreign key', () => {
    renderDialog({ mediumOptions: ['Acrylic'] });
    const input = screen.getByLabelText(/^medium$/i) as HTMLInputElement;
    expect(input.value).toBe('Acrylic');
    expect(input.readOnly).toBe(false);
    expect(input.tagName).toBe('INPUT');
  });

  it('seeds a new work with the default series it is given', () => {
    renderDialog({ artwork: null, defaultSeries: 'Kaiju Invasion Nation' });
    const select = screen.getByLabelText(/gallery series/i) as HTMLSelectElement;
    expect(select.value).toBe('Kaiju Invasion Nation');
  });
});
