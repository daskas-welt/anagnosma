import { describe, it, expect } from 'vitest';
import { findDuplicate } from '@/lib/books/duplicates';

const existing = [
  { id: 1, isbn: '9780441013593', title: 'Dune', author: 'Frank Herbert' },
  { id: 2, isbn: null, title: 'Foundation', author: 'Isaac Asimov' },
];

describe('findDuplicate', () => {
  it('matches on isbn', () => {
    const result = findDuplicate({ isbn: '9780441013593', title: 'Dune (reprint)', author: 'Herbert, F.' }, existing);
    expect(result).toEqual({ id: 1, reason: 'isbn' });
  });

  it('matches on case-insensitive title+author when isbn is absent', () => {
    const result = findDuplicate({ title: 'FOUNDATION', author: 'isaac asimov' }, existing);
    expect(result).toEqual({ id: 2, reason: 'title-author' });
  });

  it('returns null when nothing matches', () => {
    const result = findDuplicate({ title: 'Neuromancer', author: 'William Gibson' }, existing);
    expect(result).toBeNull();
  });

  it('does not match title alone without matching author', () => {
    const result = findDuplicate({ title: 'Dune', author: 'Someone Else' }, existing);
    expect(result).toBeNull();
  });
});
