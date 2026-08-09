import { CatalogPage } from '@/components/catalog-page';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Wishlist | Anagnosma',
  description: 'Keep track of books you want to purchase and read.',
};

export default function WishlistPage() {
  return <CatalogPage wishlist />;
}
