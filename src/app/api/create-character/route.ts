import {
  generateCharacterImage,
  generateImage,
} from '@/ai/image/book-illustration';
import { requireSession, unauthorizedResponse } from '@/lib/require-session';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Create Character API
 *
 * Migrated from BookBunny's app/api/create-character/route.ts
 * Added: Better Auth session validation
 * Enhancement: If user uploads a photo, uses it as reference image
 *              to generate a character that looks like the photo.
 *
 * POST /api/create-character
 * FormData: photo (File), name (string)
 * Returns: { name, imageB64, refSeed }
 */
export async function POST(req: NextRequest) {
  // 1. Validate session
  const session = await requireSession(req);
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const formData = await req.formData();
    const photo = formData.get('photo') as File | null;
    const name = (formData.get('name') as string) || 'Hero';

    const description = `A cute ${name} character, big friendly eyes, warm smile, storybook style`;

    let result: { imageB64: string; refSeed: number };

    if (photo) {
      // Convert photo to base64 and use as reference image
      const bytes = await photo.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = buffer.toString('base64');
      const dataUri = `data:${photo.type};base64,${base64}`;

      const seed = Math.floor(Math.random() * 999999);
      const prompt = `${description}, children's book illustration style, soft watercolor, warm colors, professional character design, full body, white background`;

      const imgResult = await generateImage(prompt, dataUri, { seed });
      result = {
        imageB64: imgResult.data,
        refSeed: seed,
      };
    } else {
      result = await generateCharacterImage(description);
    }

    console.log(
      `[create-character] user=${session.user.id} name="${name}" seed=${result.refSeed}`
    );

    return NextResponse.json({
      success: true,
      name,
      imageB64: result.imageB64,
      refSeed: result.refSeed,
    });
  } catch (err) {
    console.error('[create-character] error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Character creation failed',
      },
      { status: 500 }
    );
  }
}
