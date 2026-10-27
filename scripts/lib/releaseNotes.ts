/**
 * Turns one `CHANGELOG.md` section into the body of a GitHub Release.
 *
 * WHY THIS EXISTS RATHER THAN A COPY-PASTE
 * The convention (`AGENTS.md` §9) is that every tag also gets a Release object whose body is the
 * changelog section for that version, plus a line naming the deployment that carries it. Copying that
 * section by hand is a step that rots silently: **a tag and its Release body are immutable once
 * published**, so a body that disagrees with `CHANGELOG.md` stays wrong forever and nobody re-reads
 * it. Extracting it instead means the two can only disagree if the extraction is wrong — and the
 * extraction is pinned by `src/test/releaseNotes.test.ts`.
 *
 * WHAT IT DOES NOT DO
 * It does not render, summarise, or reorder anything. The body is the section **verbatim**, because
 * the whole point is that the Release and the changelog are the same text. The `## [x.y.z] - date`
 * heading is the one thing dropped: GitHub prints the release title above the body, so keeping the
 * heading would print the version twice.
 *
 * Offline and pure: no filesystem, no network, no clock. The CLI wrapper is `scripts/release-notes.ts`.
 */

export interface ReleaseNotes {
  /** Normalised — no leading `v`, no brackets. */
  version: string;
  /** ISO `YYYY-MM-DD` from the heading, or `null` when the heading carries none. */
  date: string | null;
  /** The section body, heading removed and edge separators trimmed. */
  body: string;
}

export interface ReleaseFooter {
  /** Production deployment URL, e.g. `https://roryskagenart-abc123-roryskagenart.vercel.app`. */
  deployUrl?: string | null;
  /** Merge commit on `main` the tag points at. */
  commit?: string | null;
}

function isFence(line: string): boolean {
  return /^\s*(```|~~~)/.test(line);
}

/** `v3.3.2`, `[3.3.2]`, ` 3.3.2 ` → `3.3.2`. */
export function normalizeVersion(raw: string): string {
  return raw.trim().replace(/^\[/, '').replace(/\]$/, '').trim().replace(/^v/i, '');
}

/**
 * Reads a release heading's label and date.
 * Both shapes in the file are accepted: `[3.3.2] - 2026-10-27` and a bare `3.3.2`.
 */
function parseHeading(text: string): { label: string; date: string | null } | null {
  const heading = text.trim();

  const bracketed = /^\[([^\]]+)\](?:\s*[-—]\s*(\d{4}-\d{2}-\d{2}))?/.exec(heading);
  if (bracketed) return { label: bracketed[1].trim(), date: bracketed[2] ?? null };

  const plain = /^(v?\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)(?:\s*[-—]\s*(\d{4}-\d{2}-\d{2}))?$/.exec(
    heading,
  );
  if (plain) return { label: plain[1], date: plain[2] ?? null };

  return null;
}

/** Drops blank lines and `---` rules from both ends, leaving the body itself untouched. */
function trimEdges(lines: string[]): string {
  const isPadding = (line: string) => !line.trim() || /^\s*-{3,}\s*$/.test(line);

  let start = 0;
  let end = lines.length;
  while (start < end && isPadding(lines[start])) start += 1;
  while (end > start && isPadding(lines[end - 1])) end -= 1;

  return lines.slice(start, end).join('\n');
}

/**
 * Finds the section for `version` and returns it, or `null` when the document has no such section.
 *
 * Fenced blocks are honoured in both directions: a `## ` inside a fenced example is not a boundary,
 * and a fence opened inside the section does not leak past it. `CHANGELOG.md` genuinely contains
 * fenced SQL and markdown tables, so this is not hypothetical.
 */
export function extractReleaseNotes(markdown: string, version: string): ReleaseNotes | null {
  const wanted = normalizeVersion(version);
  const lines = markdown.split(/\r?\n/);

  let inFence = false;
  let start = -1;
  let date: string | null = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (isFence(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const h2 = /^##\s+(.*)$/.exec(line);
    if (!h2) continue;

    const parsed = parseHeading(h2[1]);
    if (start === -1) {
      if (parsed && normalizeVersion(parsed.label) === wanted) {
        start = i;
        date = parsed.date;
      }
      continue;
    }
    // The next release heading closes the section.
    break;
  }

  if (start === -1) return null;

  const collected: string[] = [];
  let fence = false;

  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    const fenceLine = isFence(line);
    if (!fenceLine && !fence && /^##\s+/.test(line)) break;
    if (fenceLine) fence = !fence;
    collected.push(line);
  }

  const body = trimEdges(collected);
  if (!body) return null;

  return { version: wanted, date, body };
}

/**
 * Appends the deployment footer. Kept separate from the extraction so the body stays byte-identical
 * to the changelog section, and so a caller without a deploy URL (a dry run) gets the same body.
 */
export function composeReleaseBody(notes: ReleaseNotes, footer: ReleaseFooter = {}): string {
  const lines: string[] = [];

  const deployUrl = footer.deployUrl?.trim();
  const commit = footer.commit?.trim();

  if (deployUrl || commit) {
    lines.push('---', '');
    const parts: string[] = [];
    if (deployUrl) parts.push(`**Production:** ${deployUrl}`);
    if (commit) parts.push(`**Commit:** \`${commit.slice(0, 7)}\``);
    lines.push(`${parts.join(' · ')} — recorded in \`DEPLOYMENT_LOG.md\`.`);
  }

  if (!lines.length) return notes.body;
  return `${notes.body}\n\n${lines.join('\n')}\n`;
}
