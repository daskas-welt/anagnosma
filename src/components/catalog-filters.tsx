'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FORMATS } from '@/lib/formats';

export function CatalogFilters({
  format,
  onFormatChange,
}: {
  format: string;
  onFormatChange: (value: string) => void;
}) {
  return (
    <div className="flex gap-2">
      <Select value={format} onValueChange={(value) => onFormatChange(value ?? 'all')}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Format" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All formats</SelectItem>
          {FORMATS.map((f) => (
            <SelectItem key={f.value} value={f.value}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
