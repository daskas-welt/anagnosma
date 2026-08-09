'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { parseCsv, mapColumns, HEADER_PRESETS } from '@/lib/csv/parse';
import type { ImportCollection, ImportResult } from '@/lib/csv/import';

const TARGET_FIELDS = [
  'title',
  'author',
  'isbn',
  'format',
  'notes',
  'publisher',
  'publishYear',
  'pageCount',
  'subjects',
  'coverUrl',
];
const TARGET_FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  author: 'Author(s)',
  isbn: 'ISBN',
  format: 'Format',
  notes: 'Notes',
  publisher: 'Publisher',
  publishYear: 'Year',
  pageCount: 'Pages',
  subjects: 'Subjects',
  coverUrl: 'Cover URL',
};
const REQUIRED_FIELDS = ['title', 'author'];

export function CsvImportWizard({
  defaultCollection = 'catalog',
}: {
  defaultCollection?: ImportCollection;
}) {
  const searchParams = useSearchParams();
  const initialCollection =
    searchParams.get('collection') === 'wishlist'
      ? 'wishlist'
      : defaultCollection;
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [destination, setDestination] = useState<ImportCollection | 'column'>(
    initialCollection,
  );
  const mappingEntries = headers.map((header) => ({
    header,
    target: mapping[header] ?? '',
    sample: rawRows[0]?.[header] ?? '',
  }));
  const displayMappingEntries = mappingEntries.filter(
    (entry) => entry.header.toLowerCase() !== 'collection',
  );
  const mappedEntries = mappingEntries.filter((entry) => entry.target);
  const mappedTargets = mappedEntries.map((entry) => entry.target);
  const missingRequiredFields = REQUIRED_FIELDS.filter(
    (field) => !mappedTargets.includes(field),
  );
  const duplicateTargets = mappedTargets.filter(
    (target, index) => mappedTargets.indexOf(target) !== index,
  );
  const hasDuplicateTargets = new Set(duplicateTargets).size > 0;

  async function handleFile(file: File) {
    const text = await file.text();
    const { headers: parsedHeaders, rows } = parseCsv(text);
    setHeaders(parsedHeaders);
    setRawRows(rows);
    setResult(null);
    // Match headers against known export presets individually rather than
    // requiring every column in the file to be present in a single preset —
    // real exports have many more columns than any preset covers.
    const preset: Record<string, string> = {};
    for (const h of parsedHeaders) {
      const target =
        HEADER_PRESETS.anagnosma[h] ??
        HEADER_PRESETS.goodreads[h] ??
        HEADER_PRESETS.librarything[h];
      if (target && target !== 'collection') preset[h] = target;
    }
    setMapping(preset);
    setDestination(initialCollection);
  }

  async function handleImport() {
    if (missingRequiredFields.length > 0 || hasDuplicateTargets) return;
    setImporting(true);
    try {
      const rows = mapColumns(rawRows, mapping);
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows,
          defaultCollection:
            destination === 'wishlist' ? 'wishlist' : 'catalog',
        }),
      });
      setResult(await res.json());
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Input
        type="file"
        accept=".csv"
        className="w-full md:w-3/4 md:max-w-6xl"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      {headers.length > 0 && (
        <>
          <Card className="w-full md:w-3/4 md:max-w-6xl">
            <CardHeader className="border-b">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle>Match columns</CardTitle>
                  <CardDescription className="mt-1">
                    Review the automatic matches before importing.
                  </CardDescription>
                </div>
                <Badge variant="outline">
                  {displayMappingEntries.filter((entry) => entry.target).length}{' '}
                  of {displayMappingEntries.length} mapped
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-lg border">
                <div className="hidden grid-cols-[minmax(9rem,1fr)_minmax(10rem,1.5fr)_minmax(11rem,1fr)_minmax(8rem,auto)] gap-3 bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground md:grid">
                  <span>Source column</span>
                  <span>Sample value</span>
                  <span>Import as</span>
                  <span>Status</span>
                </div>
                {displayMappingEntries.map((entry) => {
                  const isDuplicate = duplicateTargets.includes(entry.target);
                  const isRequired = REQUIRED_FIELDS.includes(entry.target);
                  return (
                    <div
                      key={entry.header}
                      className="grid grid-cols-1 items-start gap-2 border-t px-4 py-3 md:grid-cols-[minmax(9rem,1fr)_minmax(10rem,1.5fr)_minmax(11rem,1fr)_minmax(8rem,auto)] md:items-center md:gap-3"
                    >
                      <div>
                        <span className="mb-1 block text-xs text-muted-foreground md:hidden">
                          Source column
                        </span>
                        <span
                          className="truncate text-sm font-medium"
                          title={entry.header}
                        >
                          {entry.header}
                        </span>
                      </div>
                      <div>
                        <span className="mb-1 block text-xs text-muted-foreground md:hidden">
                          Sample value
                        </span>
                        <span
                          className="line-clamp-2 text-sm text-muted-foreground"
                          title={entry.sample}
                        >
                          {entry.sample || 'No sample value'}
                        </span>
                      </div>
                      <div>
                        <span className="mb-1 block text-xs text-muted-foreground md:hidden">
                          Import as
                        </span>
                        <Select
                          value={entry.target || '__skip'}
                          onValueChange={(value) =>
                            setMapping((current) => ({
                              ...current,
                              [entry.header]:
                                value == null || value === '__skip'
                                  ? ''
                                  : value,
                            }))
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Skip" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__skip">Skip</SelectItem>
                            {TARGET_FIELDS.map((field) => (
                              <SelectItem key={field} value={field}>
                                {TARGET_FIELD_LABELS[field]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <span className="mb-1 block text-xs text-muted-foreground md:hidden">
                          Status
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {isDuplicate ? (
                            <Badge variant="destructive">
                              Duplicate target
                            </Badge>
                          ) : isRequired ? (
                            <Badge>Required</Badge>
                          ) : entry.target ? (
                            <Badge variant="secondary">Mapped</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Skipped
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {(missingRequiredFields.length > 0 || hasDuplicateTargets) && (
                <Alert variant="destructive" className="mt-3">
                  <AlertDescription>
                    {missingRequiredFields.length > 0 && (
                      <span>
                        Map required fields:{' '}
                        {missingRequiredFields
                          .map((field) => TARGET_FIELD_LABELS[field])
                          .join(', ')}
                      </span>
                    )}{' '}
                    {hasDuplicateTargets && (
                      <span>Each target field can only be mapped once.</span>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between gap-2">
                <CardTitle>Preview</CardTitle>
                <span className="text-xs text-muted-foreground">
                  First 5 rows
                </span>
              </div>
            </CardHeader>
            <CardContent className="overflow-hidden">
              <Table className="w-full table-fixed text-xs">
                <TableHeader>
                  <TableRow>
                    {mappedEntries.map((entry) => (
                      <TableHead
                        key={entry.header}
                        className="whitespace-normal break-words"
                      >
                        {TARGET_FIELD_LABELS[entry.target] ?? entry.target}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rawRows.slice(0, 5).map((row, i) => (
                    <TableRow key={i}>
                      {mappedEntries.map((entry) => (
                        <TableCell
                          key={entry.header}
                          className="whitespace-normal break-words"
                        >
                          {row[entry.header] || ''}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="sticky bottom-0 z-10 -mx-1 flex flex-col gap-3 border-t bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {missingRequiredFields.length > 0
                ? `Map ${missingRequiredFields.map((field) => TARGET_FIELD_LABELS[field]).join(' and ')} before importing.`
                : hasDuplicateTargets
                  ? 'Resolve duplicate target mappings before importing.'
                  : `${rawRows.length} books ready to import.`}
            </p>
            <Button
              onClick={() => void handleImport()}
              disabled={
                importing ||
                missingRequiredFields.length > 0 ||
                hasDuplicateTargets
              }
              className="w-full sm:w-auto"
            >
              {importing ? 'Importing...' : `Import ${rawRows.length} books`}
            </Button>
          </div>
          {importing && <Progress value={null} aria-label="Importing rows" />}
        </>
      )}

      {result && (
        <Alert>
          <AlertDescription>
            Imported {result.successCount} of {rawRows.length} rows.
            {result.duplicates.length > 0 && (
              <ul className="mt-2 list-disc pl-4">
                {result.duplicates.map((d) => (
                  <li key={d.row}>
                    {d.reason === 'isbn'
                      ? `Row ${d.row}: skipped — already in your ${d.collection ?? 'library'} (ISBN match, book #${d.matchedId})`
                      : `Row ${d.row}: possible duplicate of book #${d.matchedId} — imported anyway`}
                  </li>
                ))}
              </ul>
            )}
            {result.failures.length > 0 && (
              <ul className="mt-2 list-disc pl-4">
                {result.failures.map((f) => (
                  <li key={f.row}>
                    Row {f.row}: {f.reason}
                  </li>
                ))}
              </ul>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
