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

  it('imports a row flagged as a duplicate but still reports the match', async () => {
    const create = vi.fn().mockResolvedValue({ id: 2 });
    const existing = [{ id: 1, isbn: null, title: 'Dune', author: 'Frank Herbert' }];
    const result = await runImport(
      [{ title: 'Dune', author: 'Frank Herbert', format: 'hardcover' }],
      existing,
      create,
    );
    expect(result.successCount).toBe(1);
    expect(result.duplicates).toEqual([{ row: 1, matchedId: 1 }]);
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
