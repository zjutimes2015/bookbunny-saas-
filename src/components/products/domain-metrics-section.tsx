'use client';

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatTraffic } from '@/lib/formatter';
import { Loader2Icon } from 'lucide-react';

interface DomainMetricsSectionProps {
  domainRating: number | null;
  traffic: number | null;
  bounceRate: number | null;
  visitDuration: number | null;
  isLoading?: boolean;
}

/**
 * Format duration in seconds to XmYs format
 * e.g., 134 -> "2m14s", 45 -> "45s", 180 -> "3m"
 */
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);

  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }

  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }

  return `${minutes}m${remainingSeconds}s`;
}

export function DomainMetricsSection({
  domainRating,
  traffic,
  bounceRate,
  visitDuration,
  isLoading = false,
}: DomainMetricsSectionProps) {
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs">
      {/* Domain Rating (DR) */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Domain Rating</CardDescription>
          {isLoading ? (
            <div className="mt-2 flex items-center justify-start">
              <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <CardTitle className="mt-2 text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {domainRating !== null ? domainRating : 'N/A'}
            </CardTitle>
          )}
        </CardHeader>
      </Card>

      {/* Monthly Visits */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Monthly Visits</CardDescription>
          {isLoading ? (
            <div className="mt-2 flex items-center justify-start">
              <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <CardTitle className="mt-2 text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {traffic !== null ? formatTraffic(traffic) : 'N/A'}
            </CardTitle>
          )}
        </CardHeader>
      </Card>

      {/* Bounce Rate */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Bounce Rate</CardDescription>
          {isLoading ? (
            <div className="mt-2 flex items-center justify-start">
              <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <CardTitle className="mt-2 text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {bounceRate ? `${bounceRate}%` : 'N/A'}
            </CardTitle>
          )}
        </CardHeader>
      </Card>

      {/* Visit Duration */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Visit Duration</CardDescription>
          {isLoading ? (
            <div className="mt-2 flex items-center justify-start">
              <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <CardTitle className="mt-2 text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {visitDuration ? formatDuration(visitDuration) : 'N/A'}
            </CardTitle>
          )}
        </CardHeader>
      </Card>
    </div>
  );
}
