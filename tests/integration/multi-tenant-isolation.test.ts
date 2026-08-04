// tests/integration/multi-tenant-isolation.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { books, copies, subjects, bookSubjects } from '@/lib/db/schema';
import { createBook, getBook, updateBook, deleteBook } from '@/lib/books/repository';
import { createCopy, updateCopy, deleteCopy } from '@/lib/copies/repository';
import {
  createSubject,
  renameSubject,
  deleteSubject,
  assignSubject,
  removeSubject,
  listSubjectIdsForBook,
} from '@/lib/subjects/repository';

const USER_A = 'user_test_a';
const USER_B = 'user_test_b';

beforeEach(async () => {
  await db.delete(bookSubjects);
  await db.delete(copies);
  await db.delete(books);
  await db.delete(subjects);
});

describe('multi-tenant isolation', () => {
  it("user B cannot read, update, or delete user A's book", async () => {
    const book = await createBook(USER_A, { title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    expect(await getBook(USER_B, book.id)).toBeUndefined();
    expect(await updateBook(USER_B, book.id, { title: 'Hacked' })).toBeUndefined();
    await deleteBook(USER_B, book.id);
    expect(await getBook(USER_A, book.id)).toBeDefined();
  });

  it("user B cannot create, update, or delete a copy on user A's book", async () => {
    const book = await createBook(USER_A, { title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    expect(await createCopy(USER_B, { bookId: book.id, format: 'ebook' })).toBeUndefined();
    const copyId = book.copies[0].id;
    expect(await updateCopy(USER_B, copyId, { notes: 'hacked' })).toBeUndefined();
    expect(await deleteCopy(USER_B, copyId)).toBe(false);
  });

  it("user B cannot rename or delete user A's subject", async () => {
    const subject = await createSubject(USER_A, 'Sci-Fi');
    expect(await renameSubject(USER_B, subject.id, 'Hacked')).toBeUndefined();
    expect(await deleteSubject(USER_B, subject.id)).toBe(false);
  });

  it("user B cannot assign or remove subjects on user A's book, with either user's subject", async () => {
    const book = await createBook(USER_A, { title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    const subjectA = await createSubject(USER_A, 'Sci-Fi');
    const subjectB = await createSubject(USER_B, 'Sci-Fi');

    expect(await assignSubject(USER_B, book.id, subjectA.id)).toBe(false);
    expect(await assignSubject(USER_B, book.id, subjectB.id)).toBe(false);
    expect(await listSubjectIdsForBook(USER_B, book.id)).toEqual([]);

    expect(await assignSubject(USER_A, book.id, subjectA.id)).toBe(true);
    expect(await listSubjectIdsForBook(USER_A, book.id)).toEqual([subjectA.id]);
    expect(await removeSubject(USER_B, book.id, subjectA.id)).toBe(false);
  });
});
