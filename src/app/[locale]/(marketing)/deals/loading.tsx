import Container from '@/components/layout/container';
import { Skeleton } from '@/components/ui/skeleton';

export default function DealsLoading() {
  return (
    <Container className="px-4">
      <div className="flex gap-8">
        {/* Sidebar skeleton */}
        <div className="hidden md:block w-64 shrink-0 space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-lg" />
          ))}
        </div>

        {/* Content skeleton */}
        <div className="flex-1 space-y-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </Container>
  );
}
