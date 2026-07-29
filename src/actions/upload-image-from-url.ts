'use server';

import { websiteConfig } from '@/config/website';
import { uploadFile } from '@/storage';
import { storageConfig } from '@/storage/config/storage-config';

// Timeout for image download (30 seconds)
const IMAGE_DOWNLOAD_TIMEOUT = 30000;

/**
 * Check if URL is already in our storage
 */
function isStorageUrl(url: string): boolean {
  const { publicUrl, endpoint } = storageConfig;
  return (
    (publicUrl && url.startsWith(publicUrl)) ||
    (endpoint !== undefined && endpoint !== null && url.includes(endpoint))
  );
}

/**
 * Extract file extension from URL or content type
 */
function getFileExtension(url: string, contentType: string): string {
  const urlPath = new URL(url).pathname;
  const urlFilename = urlPath.split('/').pop() || '';

  if (urlFilename.includes('.')) {
    return urlFilename.split('.').pop() || '';
  }

  return contentType.split('/')[1]?.split(';')[0] || 'png';
}

/**
 * Download an image from URL with timeout
 */
async function downloadImageWithTimeout(
  url: string,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Image download timeout');
    }
    throw error;
  }
}

/**
 * Download an image from URL and upload it to storage
 * Returns the new storage URL if successful, or null on error
 */
export async function uploadImageFromUrl(
  imageUrl: string,
  folder: string
): Promise<string | null> {
  if (!websiteConfig.storage.enable || !imageUrl) {
    return null;
  }

  // Skip if already in our storage
  if (isStorageUrl(imageUrl)) {
    return imageUrl;
  }

  try {
    // Download with timeout
    const response = await downloadImageWithTimeout(
      imageUrl,
      IMAGE_DOWNLOAD_TIMEOUT
    );

    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.startsWith('image/')) {
      throw new Error('URL does not point to an image');
    }

    // Convert to buffer and upload
    const buffer = Buffer.from(await response.arrayBuffer());
    const extension = getFileExtension(imageUrl, contentType);
    const filename = `image.${extension}`;
    const result = await uploadFile(buffer, filename, contentType, folder);

    return result.url;
  } catch (error) {
    console.error('Upload image from URL error:', error);
    return null;
  }
}
