'use client';

import type { CategoryWithCount } from '@/actions/get-deals-by-event';
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { LocaleLink } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { CheckIcon, LayoutListIcon } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState } from 'react';

interface DealCategoryMobileProps {
  categories: CategoryWithCount[];
  eventType: string;
  totalDealsCount: number;
}

export function DealCategoryMobile({
  categories,
  eventType,
  totalDealsCount,
}: DealCategoryMobileProps) {
  const [open, setOpen] = useState(false);
  const params = useParams();
  // Extract category from array (catch-all route returns array)
  // We only need the first segment since we don't support nested categories
  const categoryParam = params?.category;
  const activeCategory = Array.isArray(categoryParam)
    ? categoryParam[0]
    : categoryParam;

  const selectedCategory = categories.find(
    (cat) => cat.slug === activeCategory
  );

  const closeDrawer = () => {
    setOpen(false);
  };

  return (
    <Drawer open={open} onClose={closeDrawer}>
      <DrawerTrigger
        onClick={() => setOpen(true)}
        className="flex items-center w-full p-4 border-y text-foreground/90 cursor-pointer"
      >
        <div className="flex items-center justify-between w-full gap-4">
          <div className="flex items-center gap-2">
            <LayoutListIcon className="size-5" />
            <span className="text-sm">Category</span>
          </div>
          <span className="text-sm">
            {selectedCategory
              ? `${selectedCategory.emoji} ${selectedCategory.name}`
              : 'All Products'}
          </span>
        </div>
      </DrawerTrigger>
      <DrawerContent className="fixed inset-x-0 bottom-0 z-50 mt-24 overflow-hidden rounded-t-[10px] border bg-background">
        <DrawerTitle className="sr-only">Category</DrawerTitle>
        {/* <div className="sticky top-0 z-20 flex w-full items-center justify-center bg-inherit">
          <div className="my-3 h-1.5 w-16 rounded-full bg-muted-foreground/20" />
        </div> */}
        <ul className="mb-14 w-full p-4 text-muted-foreground max-h-[60vh] overflow-y-auto">
          {/* All Products */}
          <li className="mb-1">
            <LocaleLink
              href={`/deals/${eventType}`}
              onClick={closeDrawer}
              className={cn(
                'flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm hover:bg-muted',
                !activeCategory &&
                  'bg-primary text-primary-foreground hover:bg-primary/90'
              )}
            >
              <div className="flex items-center gap-2">
                <span>📦</span>
                <span>All Products</span>
                <span className="text-xs opacity-70">({totalDealsCount})</span>
              </div>
              {!activeCategory && <CheckIcon className="size-4" />}
            </LocaleLink>
          </li>

          {/* Category items */}
          {categories.map((category) => (
            <li key={category.id} className="mb-1 last:mb-0">
              <LocaleLink
                href={`/deals/${eventType}/${category.slug}`}
                onClick={closeDrawer}
                className={cn(
                  'flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm hover:bg-muted',
                  category.slug === activeCategory &&
                    'bg-primary text-primary-foreground hover:bg-primary/90'
                )}
              >
                <div className="flex items-center gap-2">
                  <span>{category.emoji}</span>
                  <span>{category.name}</span>
                  <span className="text-xs opacity-70">
                    ({category.productCount})
                  </span>
                </div>
                {category.slug === activeCategory && (
                  <CheckIcon className="size-4" />
                )}
              </LocaleLink>
            </li>
          ))}
        </ul>
      </DrawerContent>
    </Drawer>
  );
}
