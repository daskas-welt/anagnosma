import { Suspense } from 'react';
import { CsvImportWizard } from '@/components/csv-import-wizard';

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ collection?: string }>;
}) {
  const { collection } = await searchParams;
  const collectionLabel = collection === 'wishlist' ? 'Wishlist' : 'Catalog';

  return (
    <div className="w-full max-w-[1600px]">
      <h1 className="mb-4 text-xl font-semibold">
        Import to {collectionLabel}
      </h1>
      <div className="mb-4 w-full rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground md:w-3/4 md:max-w-6xl">
        <p className="font-medium text-foreground">Supported imports</p>
        <p className="mt-1">
          Upload an Anagnosma export, Goodreads export, LibraryThing export, or
          any CSV and map its columns manually.
        </p>
        <p className="mt-1">
          Title and Author are required. ISBN, Publisher, Year, Format, Pages,
          Notes, Subjects, and Cover URL can also be imported. Subjects should
          be separated with semicolons; Format defaults to paperback for catalog
          rows when omitted.
        </p>
      </div>
      <Suspense fallback={null}>
        <CsvImportWizard />
      </Suspense>
    </div>
  );
}
