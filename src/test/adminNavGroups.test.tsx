import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * Sidebar grouping contract.
 *
 * The nav was one undifferentiated list of twelve rows, which is why "Users" sat
 * next to "Catalog" and nothing told a curator that Media belongs with Catalog
 * while Inquiries belongs with Planning. The sections are now data
 * (`ADMIN_NAV_GROUPS` + `group` on each row), so the two things worth pinning
 * are: every row lands in a declared section, and a section nobody can open is
 * not rendered at all.
 *
 * The role ↔ `minRole` relationship itself stays `adminNavGuard.test.ts`'s job.
 */

const auth = vi.hoisted(() => ({
  role: 'admin' as 'admin' | 'editor' | 'viewer',
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u-1', email: 'studio@roryskagenart.com', role: auth.role },
    logout: vi.fn(),
  }),
}));
vi.mock('../context/ThemeContext', () => ({
  useTheme: () => ({ isDark: false, toggleTheme: vi.fn() }),
}));

import { AdminLayout, ADMIN_NAV, ADMIN_NAV_GROUPS } from '../components/admin/AdminLayout';

function renderNav() {
  return render(
    <AdminLayout currentPath="/admin" onNavigate={() => {}}>
      <div>content</div>
    </AdminLayout>,
  );
}

/** The section headings actually rendered, in DOM order. */
function renderedGroups(): string[] {
  return Array.from(document.querySelectorAll('nav p')).map((el) => el.textContent?.trim() || '');
}

describe('ADMIN_NAV grouping data', () => {
  it('puts every nav row in a declared group', () => {
    const declared = new Set(ADMIN_NAV_GROUPS.map((group) => group.id));
    for (const item of ADMIN_NAV) {
      expect(declared.has(item.group), `${item.label} has no declared group`).toBe(true);
    }
  });

  it('declares the four sections in render order', () => {
    expect(ADMIN_NAV_GROUPS.map((group) => group.label)).toEqual([
      'Activity',
      'Content',
      'General',
      'Settings',
    ]);
  });

  it('gives every declared section at least one row', () => {
    // A section with no members is a heading that never renders — dead data.
    for (const group of ADMIN_NAV_GROUPS) {
      const rows = ADMIN_NAV.filter((item) => item.group === group.id);
      expect(rows.length, `${group.label} is empty`).toBeGreaterThan(0);
    }
  });
});

describe('the rendered sidebar', () => {
  beforeEach(() => {
    auth.role = 'admin';
  });

  it('renders all four sections for an administrator', () => {
    renderNav();
    expect(renderedGroups()).toEqual(['Activity', 'Content', 'General', 'Settings']);
  });

  it('keeps the rows that belong to each section together', () => {
    renderNav();
    const labels = Array.from(document.querySelectorAll('nav button')).map((el) =>
      el.textContent?.trim() || ''
    );
    // Activity first, then Content, then General, then Settings — the order the
    // sections declare, not the order the routes happen to be written in.
    expect(labels.slice(0, 3)).toEqual(['Inquiries', 'Planning', 'Changelog']);
    expect(labels.slice(3, 8)).toEqual(['Catalog', 'Pages', 'Media', 'Taxonomies', 'Trash']);
    expect(labels.slice(8, 10)).toEqual(['Dashboard', 'Design']);
    expect(labels.slice(10)).toEqual(['Users', 'Settings']);
  });

  it('hides a section the current role cannot open, instead of showing an empty heading', () => {
    auth.role = 'viewer';
    renderNav();

    // A viewer can read Catalog, Pages, Changelog and the Dashboard — nothing
    // behind `minRole`, so the Settings section has no members and must vanish.
    expect(renderedGroups()).toEqual(['Activity', 'Content', 'General']);
    expect(screen.queryByRole('button', { name: /^users$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^settings$/i })).not.toBeInTheDocument();
  });
});
