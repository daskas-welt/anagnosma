import { CsvImportWizard } from '@/components/csv-import-wizard';

export default function ImportPage() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Import from CSV</h1>
      <div className="mb-4 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Supported imports</p>
        <p className="mt-1">
          Upload an Anagnosma export, Goodreads export, LibraryThing export, or any CSV and map its columns manually.
        </p>
        <p className="mt-1">
          Title and Author are required. ISBN, Publisher, Year, Format, Pages, Notes, Subjects, and Cover URL can also
          be imported. Subjects should be separated with semicolons; Format defaults to paperback when omitted.
        </p>
      </div>
      <CsvImportWizard />
    </div>
  );
}
