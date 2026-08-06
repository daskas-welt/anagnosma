export function normalizeIsbn(value: string): string | null {
  const digits = value.replace(/[\s-]/g, '').toUpperCase();

  if (/^\d{9}[\dX]$/.test(digits)) return digits;
  if (/^97\d{11}$/.test(digits)) return digits;

  return null;
}
