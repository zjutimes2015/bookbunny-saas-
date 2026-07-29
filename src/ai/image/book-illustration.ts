/**
 * Book Illustration Generation
 * Migrated from BookBunny/lib/api/flux.ts
 *
 * Uses OpenRouter's FLUX model for image generation.
 * Supports reference images for character consistency.
 */

const OR_KEY = process.env.OPENROUTER_API_KEY;
const OR_BASE = 'https://openrouter.ai/api/v1';

export interface ImageResult {
  type: 'b64' | 'url';
  data: string;
}

/**
 * Generate a single image using FLUX model via OpenRouter
 *
 * @param prompt - Image generation prompt
 * @param refImage - Optional reference image (data URL or base64) for character consistency
 * @param options - Generation options (seed, model, size)
 */
export async function generateImage(
  prompt: string,
  refImage?: string,
  options?: {
    seed?: number;
    model?: string;
    size?: string;
  }
): Promise<ImageResult> {
  const model = options?.model || 'black-forest-labs/flux.2-flex';
  const size = options?.size || '1024x1024';

  const body: Record<string, unknown> = {
    model,
    prompt,
    n: 1,
    size,
  };

  // Attach reference image for character consistency
  if (refImage) {
    body.image = refImage.startsWith('data:')
      ? refImage
      : `data:image/png;base64,${refImage}`;
  }

  const res = await fetch(`${OR_BASE}/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OR_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`FLUX API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  const imgData = data.data?.[0];

  if (imgData?.b64_json) {
    return { type: 'b64', data: imgData.b64_json };
  }
  if (imgData?.url) {
    return { type: 'url', data: imgData.url };
  }

  throw new Error('No image data returned from FLUX');
}

/**
 * Generate a character reference image
 *
 * @param description - Character description
 * @returns Base64 image and seed for consistency
 */
export async function generateCharacterImage(description: string): Promise<{
  imageB64: string;
  refSeed: number;
}> {
  const seed = Math.floor(Math.random() * 999999);
  const prompt = `${description}, children's book illustration style, soft watercolor, warm colors, professional character design, full body, white background`;

  const result = await generateImage(prompt, undefined, { seed });
  return {
    imageB64: result.data,
    refSeed: seed,
  };
}

/**
 * Generate a book page illustration
 *
 * @param pagePrompt - The page text to illustrate
 * @param refImage - Reference image for character consistency
 * @param seed - Seed for consistent character style
 */
export async function generateBookPage(
  pagePrompt: string,
  refImage: string,
  seed: number
): Promise<ImageResult> {
  const fullPrompt = `${pagePrompt}, children's book illustration, soft watercolor style, warm colors, storybook quality`;
  return generateImage(fullPrompt, refImage, { seed });
}

/**
 * Default illustration style suffix
 */
export const DEFAULT_STYLE =
  'childrens book illustration, soft watercolor style, warm colors, storybook quality';
