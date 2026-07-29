'use client';

import { useDealEvents } from '@/hooks/use-public-deals';
import { useLocaleRouter } from '@/i18n/navigation';
import { AlertCircleIcon, GiftIcon, Loader2Icon } from 'lucide-react';
import { useEffect } from 'react';
import Container from '../layout/container';

export function DealRedirect() {
  const router = useLocaleRouter();
  const { data: events, isLoading, error } = useDealEvents();

  useEffect(() => {
    if (events && events.length > 0) {
      // Redirect to the first active event, or the first event if none is active
      const activeEvent =
        events.find((e) => e.status === 'active') || events[0];
      router.replace(`/deals/${activeEvent.type}`);
    }
  }, [events, router]);

  // Loading state
  if (isLoading) {
    return (
      <div className="py-16">
        <Container>
          <div className="flex flex-col items-center justify-center text-center">
            <Loader2Icon className="size-12 text-muted-foreground mb-4 animate-spin" />
            <p className="text-sm text-muted-foreground">Loading deals...</p>
          </div>
        </Container>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="py-16">
        <Container>
          <div className="flex flex-col items-center justify-center text-center">
            <AlertCircleIcon className="size-12 text-destructive/50 mb-4" />
            <h1 className="text-2xl font-bold">Failed to load deals</h1>
            <p className="text-muted-foreground mt-2">
              {error instanceof Error
                ? error.message
                : 'Something went wrong. Please try again later.'}
            </p>
          </div>
        </Container>
      </div>
    );
  }

  // No events state
  if (!events || events.length === 0) {
    return (
      <div className="py-16">
        <Container>
          <div className="flex flex-col items-center justify-center text-center">
            <GiftIcon className="size-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-4">No deals found</p>
          </div>
        </Container>
      </div>
    );
  }

  // Still redirecting (shouldn't see this, but just in case)
  return (
    <div className="py-16">
      <Container>
        <div className="flex flex-col items-center justify-center text-center">
          <Loader2Icon className="size-12 text-muted-foreground mb-4 animate-spin" />
          <p className="text-sm text-muted-foreground">Redirecting...</p>
        </div>
      </Container>
    </div>
  );
}
