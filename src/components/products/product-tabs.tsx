'use client';

import { LocaleLink, useLocalePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import {
  ChartSplineIcon,
  FileTextIcon,
  LinkIcon,
  SettingsIcon,
  TagsIcon,
} from 'lucide-react';
import type { Product } from './product-context';

interface ProductTabsProps {
  product: Product;
}

export function ProductTabs({ product }: ProductTabsProps) {
  const pathname = useLocalePathname();

  // Determine current tab based on pathname
  const backlinksPath = `/products/${product.id}/backlinks`;
  const informationPath = `/products/${product.id}/information`;
  const settingsPath = `/products/${product.id}/settings`;
  const dealsPath = `/products/${product.id}/deals`;
  const isBacklinks =
    pathname === backlinksPath || pathname.startsWith(`${backlinksPath}/`);
  const isInformation =
    pathname === informationPath || pathname.startsWith(`${informationPath}/`);
  const isSettings =
    pathname === settingsPath || pathname.startsWith(`${settingsPath}/`);
  const isDeals =
    pathname === dealsPath || pathname.startsWith(`${dealsPath}/`);
  const isOverview = !isBacklinks && !isInformation && !isSettings && !isDeals;

  const basePath = `/products/${product.id}`;

  return (
    <div className="border-b overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="flex gap-1 min-w-max">
        <LocaleLink
          href={basePath}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors hover:text-foreground flex items-center gap-2 whitespace-nowrap shrink-0',
            isOverview
              ? 'border-b-2 border-primary text-foreground'
              : 'text-muted-foreground'
          )}
        >
          <ChartSplineIcon className="size-4 shrink-0" />
          Overview
        </LocaleLink>
        <LocaleLink
          href={`${basePath}/backlinks`}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors hover:text-foreground flex items-center gap-2 whitespace-nowrap shrink-0',
            isBacklinks
              ? 'border-b-2 border-primary text-foreground'
              : 'text-muted-foreground'
          )}
        >
          <LinkIcon className="size-4 shrink-0" />
          Backlinks
        </LocaleLink>
        <LocaleLink
          href={`${basePath}/deals`}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors hover:text-foreground flex items-center gap-2 whitespace-nowrap shrink-0',
            isDeals
              ? 'border-b-2 border-primary text-foreground'
              : 'text-muted-foreground'
          )}
        >
          <TagsIcon className="size-4 shrink-0" />
          Deals
        </LocaleLink>
        <LocaleLink
          href={`${basePath}/information`}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors hover:text-foreground flex items-center gap-2 whitespace-nowrap shrink-0',
            isInformation
              ? 'border-b-2 border-primary text-foreground'
              : 'text-muted-foreground'
          )}
        >
          <FileTextIcon className="size-4 shrink-0" />
          Information
        </LocaleLink>
        <LocaleLink
          href={`${basePath}/settings`}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors hover:text-foreground flex items-center gap-2 whitespace-nowrap shrink-0',
            isSettings
              ? 'border-b-2 border-primary text-foreground'
              : 'text-muted-foreground'
          )}
        >
          <SettingsIcon className="size-4 shrink-0" />
          Settings
        </LocaleLink>
      </div>
    </div>
  );
}
