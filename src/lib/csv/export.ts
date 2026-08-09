import Papa from 'papaparse';
import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  WidthType,
} from 'docx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import packageJson from '../../../package.json';
import type { BookWithCopies } from '@/lib/books/repository';

export const exportColumns = [
  'Title',
  'Author',
  'ISBN',
  'Collection',
  'Publisher',
  'Year',
  'Format',
  'Pages',
  'Subjects',
  'Notes',
  'Cover URL',
] as const;
export const documentExportColumns = exportColumns.filter(
  (column) => column !== 'Cover URL',
);

export type ExportRow = Record<(typeof exportColumns)[number], string | number>;
export type ExportSection = { name: string; rows: ExportRow[] };

export function buildExportRows(
  books: BookWithCopies[],
  subjectNamesByBookId: Record<number, string[]>,
): ExportRow[] {
  return books.map((book) => ({
    Title: book.title,
    Author: book.author,
    ISBN: book.isbn ?? '',
    Collection: book.isWishlist ? 'Wishlist' : 'Catalog',
    Publisher: book.publisher ?? '',
    Year: book.publishYear ?? '',
    Format: book.copies[0]?.format ?? '',
    Pages: book.pageCount ?? '',
    Subjects: (subjectNamesByBookId[book.id] ?? []).join('; '),
    Notes: book.copies[0]?.notes ?? '',
    'Cover URL': book.coverUrl ?? '',
  }));
}

export function buildCsv(
  books: BookWithCopies[],
  subjectNamesByBookId: Record<number, string[]>,
): string {
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

function formatExportDate() {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(
    new Date(),
  );
}

function exportMetadata(title: string) {
  return {
    source: 'Exported from Anagnosma',
    version: `Version ${packageJson.version}`,
    date: `Export date ${formatExportDate()}`,
    collection: `Collection ${title}`,
  };
}

export function downloadCsv(filename: string, csv: string) {
  downloadBlob(filename, new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
}

export function buildExcelWorkbook(
  rows: ExportRow[],
  sections?: ExportSection[],
  title = 'Anagnosma Book Export',
): ArrayBuffer {
  const exportSections = sections ?? [{ name: title, rows }];
  const metadata = exportMetadata(title);
  const workbook = XLSX.utils.book_new();
  for (const section of exportSections) {
    const worksheetRows = [
      [metadata.source],
      [metadata.version],
      [metadata.date],
      [section.name],
      [...documentExportColumns],
      ...section.rows.map((row) =>
        documentExportColumns.map((column) => row[column]),
      ),
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetRows);
    worksheet['!merges'] = [0, 1, 2, 3].map((row) => ({
      s: { r: row, c: 0 },
      e: { r: row, c: documentExportColumns.length - 1 },
    }));
    worksheet['!cols'] = documentExportColumns.map((_, columnIndex) => ({
      wch: Math.min(
        255,
        Math.max(
          10,
          ...worksheetRows.map((row) => String(row[columnIndex] ?? '').length),
        ) + 2,
      ),
    }));
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      section.name.slice(0, 31),
    );
  }
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
}

export function downloadExcel(
  filename: string,
  rows: ExportRow[],
  sections?: ExportSection[],
  title?: string,
) {
  const workbook = buildExcelWorkbook(rows, sections, title);
  downloadBlob(
    filename,
    new Blob([workbook], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
  );
}

export async function downloadWord(
  filename: string,
  rows: ExportRow[],
  sections?: ExportSection[],
  title = 'Anagnosma Book Export',
) {
  const exportSections = sections ?? [{ name: title, rows }];
  const metadata = exportMetadata(title);
  const tables = exportSections.flatMap((section) => [
    new Paragraph({ text: section.name, heading: HeadingLevel.HEADING_2 }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: documentExportColumns.map(
            (column) =>
              new TableCell({
                children: [
                  new Paragraph({
                    text: column,
                    heading: HeadingLevel.HEADING_3,
                  }),
                ],
              }),
          ),
        }),
        ...section.rows.map(
          (row) =>
            new TableRow({
              children: documentExportColumns.map(
                (column) =>
                  new TableCell({
                    children: [new Paragraph(String(row[column]))],
                  }),
              ),
            }),
        ),
      ],
    }),
  ]);
  const document = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: metadata.source,
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({ text: metadata.version }),
          new Paragraph({ text: metadata.date }),
          new Paragraph({ text: metadata.collection }),
          ...tables,
        ],
      },
    ],
  });
  downloadBlob(filename, await Packer.toBlob(document));
}

export function downloadPdf(
  filename: string,
  rows: ExportRow[],
  sections?: ExportSection[],
  title = 'Anagnosma Book Export',
) {
  const document = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });
  const exportSections = sections ?? [{ name: title, rows }];
  const metadata = exportMetadata(title);
  exportSections.forEach((section, index) => {
    if (index > 0) document.addPage();
    document.setFontSize(18);
    document.text(metadata.source, 24, 22);
    document.setFontSize(9);
    document.text(metadata.version, 24, 34);
    document.text(metadata.date, 24, 46);
    document.text(metadata.collection, 24, 58);
    document.setFontSize(14);
    document.text(section.name, 24, 72);
    autoTable(document, {
      head: [[...documentExportColumns]],
      body: section.rows.map((row) =>
        documentExportColumns.map((column) => String(row[column])),
      ),
      styles: { fontSize: 7, cellPadding: 3, overflow: 'linebreak' },
      headStyles: { fillColor: [30, 41, 59] },
      margin: { top: 82, right: 24, bottom: 24, left: 24 },
    });
  });
  document.save(filename);
}
