/**
 * Prints (or writes) the GitHub Release body for one `CHANGELOG.md` version.
 *
 * Part of the release convention in `AGENTS.md` §9: every tag also gets a Release object, created
 * **after** the production deploy so the body can name the deployment that carries it.
 *
 *   npx tsx scripts/release-notes.ts 3.3.2
 *   npx tsx scripts/release-notes.ts 3.3.2 --deploy-url https://… --commit 5aa1d06
 *   npx tsx scripts/release-notes.ts 3.3.2 --out /tmp/notes.md
 *
 * Then:
 *   gh release create v3.3.2 --title "v3.3.2 — <name>" --notes-file /tmp/notes.md
 *
 * ⚠️ It exits non-zero when the version has no section — the alternative is publishing an empty
 * Release body, which looks like success on the releases page and is unrecoverable once the tag is
 * immutable.
 */

import fs from 'fs';
import path from 'path';
import { composeReleaseBody, extractReleaseNotes } from './lib/releaseNotes';

const CHANGELOG = 'CHANGELOG.md';

interface Args {
  version: string | null;
  deployUrl: string | null;
  commit: string | null;
  out: string | null;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { version: null, deployUrl: null, commit: null, out: null };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--deploy-url') args.deployUrl = argv[(i += 1)] ?? null;
    else if (arg === '--commit') args.commit = argv[(i += 1)] ?? null;
    else if (arg === '--out') args.out = argv[(i += 1)] ?? null;
    else if (!arg.startsWith('-') && !args.version) args.version = arg;
  }

  return args;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  if (!args.version) {
    console.error('Usage: npx tsx scripts/release-notes.ts <version> [--deploy-url <url>] [--commit <sha>] [--out <file>]');
    process.exit(1);
  }

  const changelogPath = path.resolve(process.cwd(), CHANGELOG);
  if (!fs.existsSync(changelogPath)) {
    console.error(`✗ ${CHANGELOG} not found at ${changelogPath}`);
    process.exit(1);
  }

  const notes = extractReleaseNotes(fs.readFileSync(changelogPath, 'utf8'), args.version);
  if (!notes) {
    console.error(`✗ ${CHANGELOG} has no section for "${args.version}" — nothing was published.`);
    process.exit(1);
  }

  const body = composeReleaseBody(notes, { deployUrl: args.deployUrl, commit: args.commit });

  if (args.out) {
    fs.writeFileSync(path.resolve(process.cwd(), args.out), body, 'utf8');
    console.log(`Wrote ${args.out}`);
    console.log(`  version:  ${notes.version}`);
    console.log(`  date:     ${notes.date ?? '(none in heading)'}`);
    console.log(`  body:     ${body.split('\n').length} lines, ${body.length} chars`);
    if (!args.deployUrl && !args.commit) {
      console.warn('\n⚠️  No --deploy-url / --commit given, so the body carries no deployment footer.');
    }
    return;
  }

  process.stdout.write(body);
}

main();
