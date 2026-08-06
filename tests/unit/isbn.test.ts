import { describe, expect, it } from 'vitest';
import { normalizeIsbn } from '@/lib/isbn';

describe('normalizeIsbn', () => {
  it('normalizes a scanned ISBN-13 with separators', () => {
    expect(normalizeIsbn('978-0-440-01358-1')).toBe('9780440013581');
  });

  it('accepts ISBN-10 values with an X check digit', () => {
    expect(normalizeIsbn('0-440-01358-X')).toBe('044001358X');
  });

  it('rejects non-ISBN barcode values', () => {
    expect(normalizeIsbn('123456789012')).toBeNull();
  });
});
