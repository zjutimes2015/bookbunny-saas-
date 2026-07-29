import { DealList } from '@/components/deals';

interface DealsEventPageProps {
  params: Promise<{
    type: string;
    category?: string[];
  }>;
  searchParams: Promise<{
    page?: string;
    size?: string;
  }>;
}

export default async function DealsEventPage({
  params,
  searchParams,
}: DealsEventPageProps) {
  const { type, category } = await params;
  const { page, size } = await searchParams;

  // Extract category from array (catch-all route returns array)
  // We only need the first segment since we don't support nested categories
  const activeCategory = category?.[0];

  // Parse pagination params
  const pageIndex = page ? Math.max(0, Number.parseInt(page, 10) - 1) : 0; // Convert 1-based to 0-based
  const pageSize = size ? Math.max(1, Number.parseInt(size, 10)) : 20;

  return (
    <DealList
      eventType={type}
      category={activeCategory}
      pageIndex={pageIndex}
      pageSize={pageSize}
    />
  );
}
