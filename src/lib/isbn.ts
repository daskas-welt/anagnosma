export function normalizeIsbn(value: string): string | null {
  const digits = value.replace(/[\s-]/g, '').toUpperCase();

  if (/^\d{9}[\dX]$/.test(digits)) return digits;
  if (/^97\d{11}$/.test(digits)) return digits;

  return null;
}

// The form an ISBN is stored and compared in. Real ISBNs collapse to their
// separator-free digits so that "978-0-440-01358-1" and "9780440013581" are
// recognised as the same book; anything that isn't an ISBN is kept as typed so
// hand-entered catalogue numbers survive a round trip. Blank input is dropped
// rather than stored as an empty string.
export function canonicalizeIsbn(
  value: string | null | undefined,
): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return normalizeIsbn(trimmed) ?? trimmed;
}
