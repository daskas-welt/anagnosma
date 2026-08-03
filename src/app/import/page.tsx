import { CsvImportWizard } from '@/components/csv-import-wizard';

export default function ImportPage() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Import from CSV</h1>
      <CsvImportWizard />
    </div>
  );
}
