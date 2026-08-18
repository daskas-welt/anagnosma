import type { Metadata } from 'next';
import { RecommendationsPage } from '@/components/recommendations-page';

export const metadata: Metadata = {
  title: 'Recommendations | Anagnosma',
  description: 'Discover books recommended from your catalog and subjects.',
};

export default function RecommendationsRoute() {
  return <RecommendationsPage />;
}
