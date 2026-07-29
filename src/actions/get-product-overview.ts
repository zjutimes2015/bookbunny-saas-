'use server';

import { getDb } from '@/db';
import { domainDrHistory, domainTrafficHistory } from '@/db/schema';
import type { SimilarwebResponse } from '@/lib/similarweb';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';

const getProductOverviewDataSchema = z.object({
  domainId: z.string().min(1, 'Domain ID is required'),
});

/**
 * Metrics from domain_traffic_history.data
 */
export interface DomainMetrics {
  traffic: number | null;
  bounceRate: number | null;
  visitDuration: number | null;
}

/**
 * Insights data from domain_traffic_history.data
 */
export interface DomainInsights {
  topKeywords: Array<{
    name: string;
    volume: number;
    cpc: number | null;
    estimatedValue: number;
  }>;
  sources: Record<string, number>;
  topCountryShares: Record<string, number>;
}

export interface ProductOverviewData {
  // Metrics from domain_traffic_history.data
  metrics: DomainMetrics;
  // DR history from domain_dr_history table
  drHistory: Array<{ date: string; value: number | null }>;
  // Traffic trend (last 3 months) from domain_traffic_history.data
  trafficTrend: Array<{ date: string; value: number }>;
  // Insights (keywords, sources, countries) from domain_traffic_history.data
  insights: DomainInsights | null;
}

/**
 * Get all overview data for a product in a single query
 * Fetches:
 * - Current metrics (traffic, bounceRate, visitDuration) from domain_traffic_history.data
 * - DR history from domain_dr_history table
 * - Traffic trend (last 3 months) from domain_traffic_history.data
 * - Insights (keywords, sources, countries) from domain_traffic_history.data
 */
export async function getProductOverviewAction(input: {
  domainId: string;
}) {
  try {
    const parsedInput = getProductOverviewDataSchema.parse(input);
    const db = await getDb();

    // Fetch DR history records (last 12 months) from domain_dr_history table
    const drHistoryRecords = await db
      .select()
      .from(domainDrHistory)
      .where(eq(domainDrHistory.domainId, parsedInput.domainId))
      .orderBy(desc(domainDrHistory.createdAt))
      .limit(12);

    // Fetch the latest domain_traffic_history record
    const trafficHistoryRecords = await db
      .select()
      .from(domainTrafficHistory)
      .where(eq(domainTrafficHistory.domainId, parsedInput.domainId))
      .orderBy(desc(domainTrafficHistory.createdAt))
      .limit(1);

    // Transform DR history to chart data format (oldest first)
    const drData: Array<{ date: string; value: number | null }> = [];
    const sortedDrRecords = [...drHistoryRecords].reverse();
    for (const record of sortedDrRecords) {
      const date = record.createdAt.toISOString().split('T')[0];
      drData.push({
        date,
        value: record.domainRating,
      });
    }

    // Initialize default values
    const metrics: DomainMetrics = {
      traffic: null,
      bounceRate: null,
      visitDuration: null,
    };
    let trafficTrend: Array<{ date: string; value: number }> = [];
    let insights: DomainInsights | null = null;

    // Extract data from the latest domain_traffic_history record
    if (trafficHistoryRecords.length > 0) {
      const latestRecord = trafficHistoryRecords[0];
      if (latestRecord.data && typeof latestRecord.data === 'object') {
        const apiData = latestRecord.data as SimilarwebResponse;

        // Extract current metrics
        if (apiData.Traffic) {
          // Get the latest traffic value from Visits
          if (apiData.Traffic.Visits) {
            const visits = apiData.Traffic.Visits;
            const sortedDates = Object.keys(visits).sort();
            if (sortedDates.length > 0) {
              const latestDate = sortedDates[sortedDates.length - 1];
              metrics.traffic = visits[latestDate];
            }
          }

          // Get bounce rate and visit duration from Engagement
          if (apiData.Traffic.Engagement?.BounceRate !== undefined) {
            // Convert to percentage if needed (assume it's a decimal like 0.56)
            const bounceRate = apiData.Traffic.Engagement.BounceRate;
            metrics.bounceRate =
              bounceRate > 1
                ? Number(bounceRate.toFixed(1))
                : Number((bounceRate * 100).toFixed(1));
          }

          if (apiData.Traffic.Engagement?.TimeOnSite !== undefined) {
            metrics.visitDuration = Math.round(
              apiData.Traffic.Engagement.TimeOnSite
            );
          }
        }

        // Extract traffic trend (last 3 months)
        if (apiData.Traffic?.Visits) {
          const visits = apiData.Traffic.Visits;
          const sortedDates = Object.keys(visits).sort();
          // Get last 3 months
          const last3Months = sortedDates.slice(-3);
          trafficTrend = last3Months.map((date) => ({
            date,
            value: visits[date],
          }));
        }

        // Extract insights
        const topKeywordsRaw = apiData.SEOInsights?.TopKeywords;
        const topKeywords = Array.isArray(topKeywordsRaw)
          ? topKeywordsRaw.map((keyword) => ({
              name: keyword.Name,
              volume: keyword.Volume,
              cpc: keyword.CPC,
              estimatedValue: keyword.EstimatedValue,
            }))
          : [];

        const sources = apiData.Traffic?.Sources || {};
        const topCountryShares = apiData.Traffic?.TopCountryShares || {};

        // Only set insights if we have at least some data
        if (
          topKeywords.length > 0 ||
          Object.keys(sources).length > 0 ||
          Object.keys(topCountryShares).length > 0
        ) {
          insights = {
            topKeywords,
            sources,
            topCountryShares,
          };
        }
      }
    }

    return {
      success: true,
      data: {
        metrics,
        drHistory: drData,
        trafficTrend,
        insights,
      } as ProductOverviewData,
    };
  } catch (error) {
    console.error('Get product overview data error:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to get product overview data',
    };
  }
}
