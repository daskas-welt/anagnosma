import { describe, it, expect, vi } from 'vitest';
import { runImport } from '@/lib/csv/import';

describe('runImport', () => {
  it('imports valid rows and reports a success count', async () => {
    const create = vi.fn().mockResolvedValue({ id: 1 });
    const result = await runImport(
      [
        { title: 'Dune', author: 'Frank Herbert', format: 'paperback' },
        { title: 'Foundation', author: 'Isaac Asimov', format: 'ebook' },
      ],
      [],
      create,
    );
    expect(result.successCount).toBe(2);
    expect(result.failures).toHaveLength(0);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('skips invalid rows and reports the reason without failing the batch', async () => {
    const create = vi.fn().mockResolvedValue({ id: 1 });
    const result = await runImport(
      [
        { title: 'Dune', author: 'Frank Herbert', format: 'paperback' },
        { title: '', author: 'No Title', format: 'paperback' },
      ],
      [],
      create,
    );
    expect(result.successCount).toBe(1);
    expect(result.failures).toEqual([{ row: 2, reason: 'title is required' }]);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('imports a title+author duplicate as a real second copy but still reports the match', async () => {
    const create = vi.fn().mockResolvedValue({ id: 2 });
    const existing = [{ id: 1, isbn: null, title: 'Dune', author: 'Frank Herbert' }];
    const result = await runImport(
      [{ title: 'Dune', author: 'Frank Herbert', format: 'hardcover' }],
      existing,
      create,
    );
    expect(result.successCount).toBe(1);
    expect(result.duplicates).toEqual([{ row: 1, matchedId: 1, reason: 'title-author' }]);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('skips creating a row that duplicates an EXISTING book by ISBN, flags it, and does not fail the batch', async () => {
    const create = vi.fn().mockResolvedValue({ id: 999 });
    const existing = [{ id: 1, isbn: '9780441013593', title: 'Dune', author: 'Frank Herbert' }];
    const result = await runImport(
      [{ title: 'Dune', author: 'Frank Herbert', format: 'paperback', isbn: '9780441013593' }],
      existing,
      create,
    );
    expect(create).not.toHaveBeenCalled();
    expect(result.duplicates).toEqual([{ row: 1, matchedId: 1, reason: 'isbn' }]);
    expect(result.successCount).toBe(1);
    expect(result.failures).toHaveLength(0);
    // Every row is accounted for as either a success (including skipped
    // duplicates) or a failure.
    expect(result.successCount + result.failures.length).toBe(1);
  });

  it('skips creating a row whose ISBN matches an EXISTING book once whitespace is trimmed', async () => {
    // Regression test: a leading/trailing space on the CSV's ISBN column
    // (common in real exports) must not defeat duplicate detection against
    // an already-trimmed existing ISBN and fall through to createBookFn,
    // which would hit the DB's unique constraint.
    const create = vi.fn().mockResolvedValue({ id: 999 });
    const existing = [{ id: 1, isbn: '9780441013593', title: 'Dune', author: 'Frank Herbert' }];
    const result = await runImport(
      [{ title: 'Dune', author: 'Frank Herbert', format: 'paperback', isbn: '  9780441013593  ' }],
      existing,
      create,
    );
    expect(create).not.toHaveBeenCalled();
    expect(result.duplicates).toEqual([{ row: 1, matchedId: 1, reason: 'isbn' }]);
    expect(result.successCount).toBe(1);
    expect(result.failures).toHaveLength(0);
  });

  it('catches an in-batch ISBN duplicate: two rows in the same CSV sharing an ISBN are flagged against each other', async () => {
    const create = vi.fn().mockResolvedValue({ id: 42 });
    const result = await runImport(
      [
        { title: 'Dune', author: 'Frank Herbert', format: 'paperback', isbn: '9780441013593' },
        { title: 'Dune (reprint)', author: 'Frank Herbert', format: 'hardcover', isbn: '9780441013593' },
      ],
      [],
      create,
    );
    expect(create).toHaveBeenCalledTimes(1);
    expect(result.duplicates).toEqual([{ row: 2, matchedId: 42, reason: 'isbn' }]);
    expect(result.successCount).toBe(2);
    expect(result.failures).toHaveLength(0);
  });

  it('catches an in-batch ISBN duplicate even when one row has whitespace padding the ISBN', async () => {
    // Regression test for the same trim-consistency bug, but within a single
    // CSV batch (working list) rather than against pre-existing DB rows.
    const create = vi.fn().mockResolvedValue({ id: 42 });
    const result = await runImport(
      [
        { title: 'Dune', author: 'Frank Herbert', format: 'paperback', isbn: ' 9780441013593' },
        { title: 'Dune (reprint)', author: 'Frank Herbert', format: 'hardcover', isbn: '9780441013593 ' },
      ],
      [],
      create,
    );
    expect(create).toHaveBeenCalledTimes(1);
    expect(result.duplicates).toEqual([{ row: 2, matchedId: 42, reason: 'isbn' }]);
    expect(result.successCount).toBe(2);
    expect(result.failures).toHaveLength(0);
  });

  it('reports a friendly message (not the raw Postgres error) when createBookFn rejects with a unique-violation', async () => {
    // Simulates a cross-tenant-turned-per-tenant ISBN collision that slips
    // past in-batch/existing-book duplicate detection and hits the DB's
    // per-user unique constraint directly.
    const pgError = Object.assign(new Error('duplicate key value violates unique constraint "books_user_id_isbn_unique"'), {
      code: '23505',
    });
    const create = vi.fn().mockRejectedValue(pgError);
    const result = await runImport(
      [{ title: 'Dune', author: 'Frank Herbert', format: 'paperback', isbn: '9780441013593' }],
      [],
      create,
    );
    expect(result.failures).toEqual([{ row: 1, reason: 'you already have a book with this ISBN' }]);
    expect(result.failures[0].reason).not.toMatch(/constraint|postgres/i);
  });

  it('continues importing subsequent rows after a create call throws', async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce(new Error('db error'))
      .mockResolvedValueOnce({ id: 1 });
    const result = await runImport(
      [
        { title: 'Bad Row', author: 'X', format: 'paperback' },
        { title: 'Dune', author: 'Frank Herbert', format: 'paperback' },
      ],
      [],
      create,
    );
    expect(result.successCount).toBe(1);
    expect(result.failures).toEqual([{ row: 1, reason: 'db error' }]);
  });
});
