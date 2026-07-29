'use client';

import { TopCountriesCard } from './top-countries-card';
import { TopKeywordsCard } from './top-keywords-card';
import { TrafficSourcesChart } from './traffic-sources-chart';

interface DomainInsightsSectionProps {
  insights: {
    topKeywords: Array<{
      name: string;
      volume: number;
      cpc: number | null;
      estimatedValue: number;
    }>;
    sources: Record<string, number>;
    topCountryShares: Record<string, number>;
  } | null;
  isLoading?: boolean;
}

export function DomainInsightsSection({
  insights,
  isLoading = false,
}: DomainInsightsSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <TopKeywordsCard
        keywords={insights?.topKeywords ?? []}
        isLoading={isLoading}
      />
      <TrafficSourcesChart
        sources={insights?.sources ?? {}}
        isLoading={isLoading}
      />
      <TopCountriesCard
        countries={insights?.topCountryShares ?? {}}
        isLoading={isLoading}
      />
    </div>
  );
}
