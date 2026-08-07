import { describe, expect, it } from 'vitest';
import {
  canonicalizeIsbn,
  normalizeIsbn,
  parsePageCount,
  parsePublishYear,
} from '@/lib/isbn';

describe('normalizeIsbn', () => {
  it('normalizes a scanned ISBN-13 with separators', () => {
    expect(normalizeIsbn('978-0-441-01359-3')).toBe('9780441013593');
  });

  it('accepts ISBN-10 values with an X check digit', () => {
    expect(normalizeIsbn('123456789X')).toBe('123456789X');
  });

  it('rejects non-ISBN barcode values', () => {
    expect(normalizeIsbn('123456789012')).toBeNull();
  });

  it('rejects ISBNs with an invalid check digit', () => {
    expect(normalizeIsbn('9780441013590')).toBeNull();
    expect(normalizeIsbn('1234567890')).toBeNull();
  });
});

describe('canonicalizeIsbn', () => {
  it('collapses separator variants of one ISBN to the same value', () => {
    expect(canonicalizeIsbn('978-0-441-01359-3')).toBe('9780441013593');
    expect(canonicalizeIsbn(' 9780441013593 ')).toBe('9780441013593');
  });

  it('keeps non-ISBN identifiers as typed', () => {
    expect(canonicalizeIsbn('shelf-ref-12')).toBe('shelf-ref-12');
  });

  it('treats blank and missing values as absent', () => {
    expect(canonicalizeIsbn('   ')).toBeUndefined();
    expect(canonicalizeIsbn(null)).toBeUndefined();
    expect(canonicalizeIsbn(undefined)).toBeUndefined();
  });
});

describe('parsePublishYear', () => {
  it('accepts a 4-digit year', () => {
    expect(parsePublishYear('2004')).toBe(2004);
  });

  it('treats blank as cleared', () => {
    expect(parsePublishYear('  ')).toBeNull();
  });

  it('rejects non-4-digit values', () => {
    expect(parsePublishYear('12')).toBe('invalid');
    expect(parsePublishYear('20241')).toBe('invalid');
  });
});

describe('parsePageCount', () => {
  it('accepts whole numbers', () => {
    expect(parsePageCount('464')).toBe(464);
  });

  it('treats blank as cleared', () => {
    expect(parsePageCount('')).toBeNull();
  });

  it('rejects non-numeric values', () => {
    expect(parsePageCount('12.5')).toBe('invalid');
    expect(parsePageCount('abc')).toBe('invalid');
  });
});
