import { extractDomain } from './urls/urls';

interface AhrefsResponse {
  success: boolean;
  data?: {
    domainRating?: number;
    ahRank?: number;
  };
  error?: string;
}

export interface DomainRating {
  domainRating: number | null;
  ahRank: number | null;
}

/**
 * Fetch domain rating from Ahrefs API via RapidAPI
 */
export async function fetchDomainRating(url: string): Promise<DomainRating> {
  const apiKey = process.env.RAPIDAPI_AHREFS_KEY;

  if (!apiKey) {
    throw new Error('RAPIDAPI_AHREFS_KEY is not configured');
  }

  // Extract domain from URL
  const domain = extractDomain(url);

  try {
    const response = await fetch(
      `https://ahrefs-domain-research.p.rapidapi.com/basic-metrics?url=${domain}`,
      {
        method: 'GET',
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': 'ahrefs-domain-research.p.rapidapi.com',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Ahrefs API error: ${response.statusText}`);
    }

    const data: AhrefsResponse = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch domain rating');
    }

    return {
      domainRating: data.data?.domainRating ?? null,
      ahRank: data.data?.ahRank ?? null,
    };
  } catch (error) {
    console.error('Error fetching domain rating:', error);
    throw error;
  }
}
