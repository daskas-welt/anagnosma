import Papa from 'papaparse';
import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, WidthType } from 'docx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { BookWithCopies } from '@/lib/books/repository';

export const exportColumns = [
  'Title',
  'Author',
  'ISBN',
  'Publisher',
  'Year',
  'Format',
  'Pages',
  'Subjects',
  'Notes',
  'Cover URL',
] as const;

export type ExportRow = Record<(typeof exportColumns)[number], string | number>;

export function buildExportRows(
  books: BookWithCopies[],
  subjectNamesByBookId: Record<number, string[]>,
): ExportRow[] {
  return books.map((book) => ({
    Title: book.title,
    Author: book.author,
    ISBN: book.isbn ?? '',
    Publisher: book.publisher ?? '',
    Year: book.publishYear ?? '',
    Format: book.copies[0]?.format ?? '',
    Pages: book.pageCount ?? '',
    Subjects: (subjectNamesByBookId[book.id] ?? []).join('; '),
    Notes: book.copies[0]?.notes ?? '',
    'Cover URL': book.coverUrl ?? '',
  }));
}

export function buildCsv(books: BookWithCopies[], subjectNamesByBookId: Record<number, string[]>): string {
  const rows = buildExportRows(books, subjectNamesByBookId);
  return Papa.unparse(rows);
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadCsv(filename: string, csv: string) {
  downloadBlob(filename, new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
}

export function downloadExcel(filename: string, rows: ExportRow[]) {
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: [...exportColumns] });
  worksheet['!cols'] = exportColumns.map((column) => ({ wch: Math.min(40, Math.max(column.length + 2, 14)) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Books');
  XLSX.writeFile(workbook, filename);
}

export async function downloadWord(filename: string, rows: ExportRow[]) {
  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: exportColumns.map((column) =>
          new TableCell({ children: [new Paragraph({ text: column, heading: HeadingLevel.HEADING_3 })] }),
        ),
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            children: exportColumns.map((column) => new TableCell({ children: [new Paragraph(String(row[column]))] })),
          }),
      ),
    ],
  });
  const document = new Document({
    sections: [{ children: [new Paragraph({ text: 'Anagnosma Book Catalog', heading: HeadingLevel.HEADING_1 }), table] }],
  });
  downloadBlob(filename, await Packer.toBlob(document));
}

export function downloadPdf(filename: string, rows: ExportRow[]) {
  const document = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  autoTable(document, {
    head: [[...exportColumns]],
    body: rows.map((row) => exportColumns.map((column) => String(row[column]))),
    styles: { fontSize: 7, cellPadding: 3, overflow: 'linebreak' },
    headStyles: { fillColor: [30, 41, 59] },
    margin: 24,
  });
  document.save(filename);
}
