/**
 * Pins the GitHub Release body extractor.
 *
 * WHY THIS IS WORTH A TEST
 * The output is published to an immutable place: once `gh release create` runs, neither the tag nor
 * the body can be corrected in place without deleting the Release. A wrong extraction therefore does
 * not fail loudly — it produces a plausible-looking body that quietly disagrees with `CHANGELOG.md`
 * forever. The cases below are the ways that happens: swallowing the *next* release's notes, ending
 * the section at a `## ` inside a fenced SQL block, or emitting a body with no heading match at all.
 *
 * The last case runs against the real `CHANGELOG.md`, because a fixture can only prove the parser
 * agrees with itself — the document is hand-maintained and its shape is the actual input.
 *
 * Offline: no network, no clock.
 */
import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import {
  composeReleaseBody,
  extractReleaseNotes,
  normalizeVersion,
} from '../../scripts/lib/releaseNotes';

const FIXTURE = [
  '# Changelog',
  '',
  'A preamble that is not a release.',
  '',
  '---',
  '',
  '## [3.3.2] - 2026-10-27',
  '',
  '> **"Release objects"** — the short version.',
  '',
  '### Added',
  '',
  '- **A thing.** With a detail.',
  '',
  '## [3.3.1] - 2026-10-26',
  '',
  '### Changed',
  '',
  '- The previous thing.',
].join('\n');

const FENCE_FIXTURE = [
  '## [3.3.2] - 2026-10-27',
  '',
  '### Added',
  '',
  '```sql',
  '## this is a comment, not a heading',
  'select 1;',
  '```',
  '',
  '- after the fence',
  '',
  '## [3.3.1] - 2026-10-26',
  '',
  '### Changed',
  '',
  '- previous',
].join('\n');

describe('normalizeVersion', () => {
  it('accepts the forms a human or a shell actually types', () => {
    for (const input of ['3.3.2', 'v3.3.2', '[3.3.2]', '  3.3.2  ']) {
      expect(normalizeVersion(input)).toBe('3.3.2');
    }
  });
});

describe('extractReleaseNotes', () => {
  it('returns the section body with the heading dropped and the date parsed', () => {
    const notes = extractReleaseNotes(FIXTURE, '3.3.2');
    expect(notes).not.toBeNull();
    expect(notes!.version).toBe('3.3.2');
    expect(notes!.date).toBe('2026-10-27');
    expect(notes!.body).toBe(
      ['> **"Release objects"** — the short version.', '', '### Added', '', '- **A thing.** With a detail.'].join('\n'),
    );
  });

  it('never keeps the `## [x.y.z]` heading — the release title already prints the version', () => {
    const notes = extractReleaseNotes(FIXTURE, '3.3.2');
    expect(notes!.body).not.toContain('## [3.3.2]');
  });

  it('stops at the next release heading instead of swallowing the older release', () => {
    const notes = extractReleaseNotes(FIXTURE, '3.3.2');
    expect(notes!.body).not.toContain('The previous thing.');
    expect(notes!.body).not.toContain('3.3.1');
  });

  it('does not end the section at a `## ` inside a fenced block', () => {
    const notes = extractReleaseNotes(FENCE_FIXTURE, '3.3.2');
    expect(notes!.body).toContain('select 1;');
    expect(notes!.body).toContain('- after the fence');
    expect(notes!.body).not.toContain('- previous');
  });

  it('accepts a bare heading with no brackets', () => {
    const notes = extractReleaseNotes('## 3.3.2 - 2026-10-27\n\n### Added\n\n- x\n', 'v3.3.2');
    expect(notes!.body).toBe('### Added\n\n- x');
  });

  it('trims edge separators and blank lines but keeps interior ones', () => {
    const notes = extractReleaseNotes(
      ['## [3.3.2] - 2026-10-27', '', '---', '', '### Added', '', '- x', '', '---', '', '## [3.3.1] - 2026-10-26'].join('\n'),
      '3.3.2',
    );
    expect(notes!.body).toBe('### Added\n\n- x');
  });

  it('returns null when the version has no section — an empty Release body must not be publishable', () => {
    expect(extractReleaseNotes(FIXTURE, '9.9.9')).toBeNull();
    expect(extractReleaseNotes('## [3.3.2] - 2026-10-27\n\n## [3.3.1] - 2026-10-26\n', '3.3.2')).toBeNull();
  });

  it('reads the real CHANGELOG.md, not just a fixture that agrees with the parser', () => {
    const changelog = readFileSync(path.resolve(__dirname, '../../CHANGELOG.md'), 'utf8');
    const notes = extractReleaseNotes(changelog, '3.3.1');

    expect(notes).not.toBeNull();
    expect(notes!.date).toBe('2026-10-26');
    expect(notes!.body.length).toBeGreaterThan(500);
    expect(notes!.body).toContain('### Changed');
  });
});

describe('composeReleaseBody', () => {
  const notes = { version: '3.3.2', date: '2026-10-27', body: '### Added\n\n- x' };

  it('leaves the body byte-identical when there is no deployment to name', () => {
    expect(composeReleaseBody(notes)).toBe(notes.body);
  });

  it('appends the deployment footer after the body, not before it', () => {
    const body = composeReleaseBody(notes, {
      deployUrl: 'https://roryskagenart-abc123-roryskagenart.vercel.app',
      commit: '5aa1d062af95dd0f567af2321d4a750db37d1ba9',
    });

    expect(body.startsWith(notes.body)).toBe(true);
    expect(body).toContain('**Production:** https://roryskagenart-abc123-roryskagenart.vercel.app');
    // Short SHA, because a full one in prose is unreadable and nobody needs the tail.
    expect(body).toContain('**Commit:** `5aa1d06`');
    expect(body).not.toContain('5aa1d062af95');
  });

  it('omits the footer entirely rather than printing an empty one', () => {
    const body = composeReleaseBody(notes, { deployUrl: '', commit: '   ' });
    expect(body).toBe(notes.body);
    expect(body).not.toContain('**Production:**');
  });
});
