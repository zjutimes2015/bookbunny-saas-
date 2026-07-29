interface FirecrawlMetadata {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogSiteName?: string;
  language?: string;
  sourceURL?: string;
  statusCode?: number;
}

interface FirecrawlResponse {
  success: boolean;
  data?: {
    metadata?: FirecrawlMetadata;
    markdown?: string;
    html?: string;
  };
  error?: string;
}

export interface WebsiteInfo {
  name: string;
  description: string;
  ogImage: string;
  markdown?: string;
}

/**
 * Fetch website metadata using Firecrawl API
 */
export async function fetchWebsiteInfo(url: string): Promise<WebsiteInfo> {
  const apiKey = process.env.FIRECRAWL_API_KEY;

  if (!apiKey) {
    throw new Error('FIRECRAWL_API_KEY is not configured');
  }

  // Normalize URL
  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;

  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url: normalizedUrl,
        formats: ['markdown'],
        onlyMainContent: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Firecrawl API error: ${response.statusText}${errorData.error ? ` - ${errorData.error}` : ''}`
      );
    }

    const data: FirecrawlResponse = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch website metadata');
    }

    const metadata = data.data?.metadata;

    if (!metadata) {
      throw new Error('No metadata returned from Firecrawl');
    }

    // Extract domain name from URL
    const domain = new URL(normalizedUrl).hostname.replace('www.', '');

    return {
      name: metadata.ogSiteName || metadata.ogTitle || metadata.title || domain,
      description: metadata.ogDescription || metadata.description || '',
      ogImage: metadata.ogImage || '',
      markdown: data.data?.markdown,
    };
  } catch (error) {
    console.error('Error fetching website info:', error);
    throw error;
  }
}
