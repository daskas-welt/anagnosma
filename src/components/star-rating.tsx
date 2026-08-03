'use client';

import { Star } from 'lucide-react';

export function StarRating({ value, onChange }: { value: number | null; onChange: (rating: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} aria-label={`Rate ${n} stars`}>
          <Star className={n <= (value ?? 0) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'} size={18} />
        </button>
      ))}
    </div>
  );
}
