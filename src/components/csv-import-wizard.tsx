'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { parseCsv, mapColumns, HEADER_PRESETS } from '@/lib/csv/parse';
import type { ImportResult } from '@/lib/csv/import';

const TARGET_FIELDS = ['title', 'author', 'isbn', 'format', 'status', 'rating', 'notes', 'publisher', 'pageCount'];

export function CsvImportWizard() {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);

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
      const target = HEADER_PRESETS.goodreads[h] ?? HEADER_PRESETS.librarything[h];
      if (target) preset[h] = target;
    }
    setMapping(preset);
  }

  async function handleImport() {
    setImporting(true);
    try {
      const rows = mapColumns(rawRows, mapping);
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
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
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      {headers.length > 0 && (
        <>
          <div>
            <h3 className="mb-2 text-sm font-medium">Map columns</h3>
            <div className="grid grid-cols-2 gap-2">
              {headers.map((header) => (
                <div key={header} className="flex items-center gap-2">
                  <span className="w-40 truncate text-sm">{header}</span>
                  <Select
                    value={mapping[header] ?? '__skip'}
                    onValueChange={(v) => setMapping((m) => ({ ...m, [header]: v === '__skip' || v == null ? '' : v }))}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Skip" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__skip">Skip</SelectItem>
                      {TARGET_FIELDS.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium">Preview (first 5 rows)</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  {Object.values(mapping)
                    .filter(Boolean)
                    .map((field) => (
                      <TableHead key={field}>{field}</TableHead>
                    ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {mapColumns(rawRows.slice(0, 5), mapping).map((row, i) => (
                  <TableRow key={i}>
                    {Object.values(mapping)
                      .filter(Boolean)
                      .map((field) => (
                        <TableCell key={field}>{row[field]}</TableCell>
                      ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Button onClick={() => void handleImport()} disabled={importing}>
            {importing ? 'Importing...' : `Import ${rawRows.length} rows`}
          </Button>
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
                      ? `Row ${d.row}: skipped — already in your library (ISBN match, book #${d.matchedId})`
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
