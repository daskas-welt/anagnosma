import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { BookWithCopies } from '@/lib/books/repository';

export function CatalogTable({ books, onSelect }: { books: BookWithCopies[]; onSelect: (id: number) => void }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Author</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Rating</TableHead>
          <TableHead>Shelf</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {books.map((book) => (
          <TableRow key={book.id} className="cursor-pointer" onClick={() => onSelect(book.id)}>
            <TableCell>{book.title}</TableCell>
            <TableCell>{book.author}</TableCell>
            <TableCell>{book.copies[0]?.status}</TableCell>
            <TableCell>{book.copies[0]?.rating ?? '—'}</TableCell>
            <TableCell>{book.copies[0]?.shelfLocation ?? '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
