// Canonical book formats: stored value (used in copies.format and filters)
// paired with its display label. Keep this the single source of truth so the
// add-book form, the format filter, and catalog display all stay in sync.
export const FORMATS: { value: string; label: string }[] = [
  { value: 'ebook', label: 'E-book' },
  { value: 'paperback', label: 'Paperback' },
  { value: 'hardcover', label: 'Hardcover' },
  { value: 'audiobook', label: 'Audiobook' },
];

const LABEL_BY_VALUE = new Map(FORMATS.map((f) => [f.value, f.label]));

export function formatLabel(value: string | null | undefined): string {
  if (!value) return '—';
  return LABEL_BY_VALUE.get(value) ?? value;
}
