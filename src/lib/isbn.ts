function isbn10CheckDigit(body: string): string {
  let sum = 0;
  for (let i = 0; i < 9; i += 1) {
    sum += Number(body[i]) * (10 - i);
  }
  const remainder = (11 - (sum % 11)) % 11;
  return remainder === 10 ? 'X' : String(remainder);
}

function isbn13CheckDigit(body: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i += 1) {
    sum += Number(body[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return String((10 - (sum % 10)) % 10);
}

export function normalizeIsbn(value: string): string | null {
  const digits = value.replace(/[\s-]/g, '').toUpperCase();

  if (/^\d{9}[\dX]$/.test(digits)) {
    if (isbn10CheckDigit(digits.slice(0, 9)) !== digits[9]) return null;
    return digits;
  }

  if (/^97[89]\d{10}$/.test(digits)) {
    if (isbn13CheckDigit(digits.slice(0, 12)) !== digits[12]) return null;
    return digits;
  }

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

export function parsePublishYear(value: string): number | null | 'invalid' {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{4}$/.test(trimmed)) return 'invalid';
  return Number(trimmed);
}

export function parsePageCount(value: string): number | null | 'invalid' {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) return 'invalid';
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 'invalid';
}
