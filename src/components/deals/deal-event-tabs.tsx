'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useDealEvents } from '@/hooks/use-public-deals';
import { LocaleLink } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { AlertCircleIcon } from 'lucide-react';
import { useParams } from 'next/navigation';

export function DealEventTabs() {
  const params = useParams();
  const activeEventType = params?.type as string | undefined;
  const { data: events, isLoading, error } = useDealEvents();

  // Loading state - show skeleton tabs
  if (isLoading) {
    return (
      <div className="w-full overflow-x-auto">
        <div className="flex items-center justify-center gap-2 min-w-max px-2 pb-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-md shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  // Error state - show error but don't block the page
  if (error) {
    return (
      <div className="flex items-center justify-center gap-2 text-destructive">
        <AlertCircleIcon className="size-4" />
        <span className="text-sm">
          {error instanceof Error ? error.message : 'Failed to load events'}
        </span>
      </div>
    );
  }

  // No events state
  if (!events || events.length === 0) {
    return null;
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-center justify-center gap-2 min-w-max px-2 pb-2">
        {events.map((event) => (
          <LocaleLink
            key={event.id}
            href={`/deals/${event.type}`}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors border whitespace-nowrap shrink-0',
              event.type === activeEventType
                ? 'bg-muted border-border text-foreground font-medium'
                : 'bg-background border-border hover:bg-muted text-muted-foreground'
            )}
          >
            {/* Status indicator dot */}
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full shrink-0',
                event.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
              )}
            />
            <span>{event.name}</span>
          </LocaleLink>
        ))}
      </div>
    </div>
  );
}
