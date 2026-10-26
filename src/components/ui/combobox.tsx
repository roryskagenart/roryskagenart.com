import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ComboboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'list'> {
  /**
   * Suggestions offered in the dropdown. Sourced from the database (taxonomies
   * plus values already in use), so the list is always current.
   */
  options: string[];
}

/**
 * Free-text input with a native `<datalist>` dropdown.
 *
 * WHY NOT `<Select>`: `artworks.medium`, `.location` and `.edition` are plain
 * text columns with no foreign key — a strict select silently makes every value
 * outside its option list unreachable, and would rewrite real catalog data on
 * save. The datalist gives the curator the same one-click dropdown for values
 * that exist while keeping the column free-form.
 *
 * Zero dependencies: the popup is the browser's own, so it follows the OS theme
 * and cannot drift from the design system the way a custom portal would.
 */
const Combobox = React.forwardRef<HTMLInputElement, ComboboxProps>(
  ({ className, options, id, ...props }, ref) => {
    const generatedId = React.useId();
    const listId = `${id || generatedId}-options`;
    // De-duplicate and drop blanks: a taxonomy can legitimately hold an empty
    // name, and a datalist with duplicate options renders each one twice.
    const unique = React.useMemo(
      () => Array.from(new Set(options.map((o) => o.trim()).filter(Boolean))),
      [options]
    );

    return (
      <div className="relative">
        <input
          ref={ref}
          id={id}
          list={listId}
          autoComplete="off"
          className={cn(
            'flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 pr-8 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          {...props}
        />
        <datalist id={listId}>
          {unique.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    );
  }
);
Combobox.displayName = 'Combobox';

export { Combobox };
