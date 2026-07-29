'use client';

import type { CategoryWithCount } from '@/actions/get-deals-by-event';
import { LocaleLink } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';

interface DealCategorySidebarProps {
  categories: CategoryWithCount[];
  eventType: string;
  totalDealsCount: number;
}

export function DealCategorySidebar({
  categories,
  eventType,
  totalDealsCount,
}: DealCategorySidebarProps) {
  const params = useParams();
  // Extract category from array (catch-all route returns array)
  // We only need the first segment since we don't support nested categories
  const activeCategory = useMemo(() => {
    const categoryParam = params?.category;
    return Array.isArray(categoryParam) ? categoryParam[0] : categoryParam;
  }, [params?.category]);
  return (
    <nav className="w-64 shrink-0">
      <ul className="space-y-1">
        {/* All Products */}
        <li>
          <LocaleLink
            href={`/deals/${eventType}`}
            className={cn(
              'flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              !activeCategory
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-foreground'
            )}
          >
            <div className="flex items-center gap-2">
              <span>📦</span>
              <span>All Products</span>
            </div>
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-xs',
                !activeCategory
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {totalDealsCount}
            </span>
          </LocaleLink>
        </li>

        {/* Category items */}
        {categories.map((category) => (
          <li key={category.id}>
            <LocaleLink
              href={`/deals/${eventType}/${category.slug}`}
              className={cn(
                'flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                category.slug === activeCategory
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-foreground'
              )}
            >
              <div className="flex items-center gap-2">
                <span>{category.emoji}</span>
                <span>{category.name}</span>
              </div>
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-xs',
                  category.slug === activeCategory
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {category.productCount}
              </span>
            </LocaleLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
