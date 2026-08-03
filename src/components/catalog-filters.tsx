'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const STATUSES = ['to-read', 'reading', 'read', 'dnf'];
const FORMATS = ['hardcover', 'paperback', 'ebook', 'audiobook'];

export function CatalogFilters({
  status,
  format,
  onStatusChange,
  onFormatChange,
}: {
  status: string;
  format: string;
  onStatusChange: (value: string) => void;
  onFormatChange: (value: string) => void;
}) {
  return (
    <div className="flex gap-2">
      <Select value={status} onValueChange={(value) => onStatusChange(value ?? 'all')}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={format} onValueChange={(value) => onFormatChange(value ?? 'all')}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Format" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All formats</SelectItem>
          {FORMATS.map((f) => (
            <SelectItem key={f} value={f}>
              {f}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
