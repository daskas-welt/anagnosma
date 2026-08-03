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
    expect(result.duplicates).toEqual([{ row: 1, matchedId: 1 }]);
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
    expect(result.duplicates).toEqual([{ row: 1, matchedId: 1 }]);
    expect(result.successCount).toBe(1);
    expect(result.failures).toHaveLength(0);
    // Every row is accounted for as either a success (including skipped
    // duplicates) or a failure.
    expect(result.successCount + result.failures.length).toBe(1);
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
    expect(result.duplicates).toEqual([{ row: 2, matchedId: 42 }]);
    expect(result.successCount).toBe(2);
    expect(result.failures).toHaveLength(0);
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
