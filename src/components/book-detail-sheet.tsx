// Placeholder created in Task 12 so `src/app/page.tsx` has a working import ahead of
// Task 14, which builds the real detail sheet. Task 14's implementer should replace the
// body of this component (and update this comment) rather than create a new file or
// change the exported interface below, since `page.tsx` already depends on it.
export function BookDetailSheet({
  bookId,
  onClose,
  onChanged,
}: {
  bookId: number | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  void bookId;
  void onClose;
  void onChanged;
  return null;
}
