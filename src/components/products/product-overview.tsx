'use client';

import { useProductOverview } from '@/hooks/use-product-overview';
import { DomainDrChart } from './domain-dr-chart';
import { DomainInsightsSection } from './domain-insights-section';
import { DomainMetricsSection } from './domain-metrics-section';
import { DomainTrafficChart } from './domain-traffic-chart';
import { useProduct } from './product-context';

/**
 * ProductOverview Component
 *
 * Main container component for displaying product analytics and insights.
 * Fetches all required data in a single query and passes it to child components.
 *
 * Data sources:
 * 1. Domain Rating (DR): from domain table via product.domainRating
 * 2. Metrics (traffic, bounceRate, visitDuration): from domain_traffic_history.data
 * 3. DR History: from domain_dr_history table
 * 4. Traffic Trend (last 3 months): from domain_traffic_history.data.Traffic.Visits
 * 5. Insights (keywords, sources, countries): from domain_traffic_history.data
 */
export function ProductOverview() {
  // Get the product from the context
  const product = useProduct();

  // Fetch all overview data in a single query from domain_dr_history and domain_traffic_history
  const {
    data: overviewData,
    isLoading,
    isError,
  } = useProductOverview(product.domainId);

  // Extract data from the query result
  const metrics = overviewData?.metrics ?? {
    traffic: null,
    bounceRate: null,
    visitDuration: null,
  };
  const drHistory = isError ? [] : (overviewData?.drHistory ?? []);
  const trafficTrend = isError ? [] : (overviewData?.trafficTrend ?? []);
  const insights = isError ? null : (overviewData?.insights ?? null);

  return (
    <div className="space-y-6">
      {/* Section 1: Domain Metrics */}
      {/* DR comes from domain table, other metrics from domain_traffic_history.data */}
      <DomainMetricsSection
        domainRating={product.domainRating}
        traffic={metrics.traffic}
        bounceRate={metrics.bounceRate}
        visitDuration={metrics.visitDuration}
        isLoading={isLoading}
      />

      {/* Section 2: Trend Charts */}
      {/* DR history from domain_dr_history, Traffic trend from domain_traffic_history.data */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <DomainDrChart data={drHistory} isLoading={isLoading} />
        <DomainTrafficChart data={trafficTrend} isLoading={isLoading} />
      </div>

      {/* Section 3: Domain Insights */}
      {/* Keywords, Sources, Countries from domain_traffic_history.data */}
      <DomainInsightsSection insights={insights} isLoading={isLoading} />
    </div>
  );
}
