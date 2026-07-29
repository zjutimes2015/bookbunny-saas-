import { extractDomain } from './urls/urls';

/**
 * Raw API response from Similarweb via RapidAPI
 * This is the data structure stored in domain_traffic_history.data
 */
export interface SimilarwebResponse {
  SEOInsights?: {
    TopKeywords?: Array<{
      CPC: number | null;
      Volume: number;
      Name: string;
      EstimatedValue: number;
    }>;
  };
  SnapshotDate?: string;
  Traffic?: {
    Visits?: Record<string, number>; // {"2025-08-01": 12343, "2025-09-01": 19099, ...}
    TopCountryShares?: Record<string, number>; // {"HK": 0.15, "CN": 0.42, ...}
    Sources?: Record<string, number>; // {"Direct": 0.48, "Search": 0.18, ...}
    Engagement?: {
      TimeOnSite: number;
      BounceRate: number;
      PagesPerVisit: number;
    };
    IsDataFromGa?: boolean;
  };
  WebsiteDetails?: {
    Domain?: string;
    Category?: string;
    Description?: string;
    Title?: string;
  };
  Rank?: {
    GlobalRank?: number;
    CountryRank?: {
      Country?: string;
      Rank?: number;
    };
    CategoryRank?: {
      Rank?: number | null;
      Category?: string | null;
    };
  };
}

/**
 * Fetch raw Similarweb API response
 * Used by cron jobs to store complete API response in database
 */
export async function fetchSimilarwebData(
  domainUrl: string
): Promise<SimilarwebResponse> {
  const apiKey = process.env.RAPIDAPI_SIMILARWEB_KEY;

  if (!apiKey) {
    throw new Error('RAPIDAPI_SIMILARWEB_KEY is not configured');
  }

  // Extract domain from URL if needed
  const cleanDomain = extractDomain(domainUrl);

  const response = await fetch(
    `https://similarweb-insights.p.rapidapi.com/all-insights?domain=${cleanDomain}`,
    {
      method: 'GET',
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'similarweb-insights.p.rapidapi.com',
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Similarweb API error: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}
