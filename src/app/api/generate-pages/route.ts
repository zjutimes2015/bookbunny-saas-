import { DEFAULT_STYLE, generateImage } from '@/ai/image/book-illustration';
import { requireSession, unauthorizedResponse } from '@/lib/require-session';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Generate Pages API (Image Generation)
 *
 * Migrated from BookBunny's app/api/generate-pages/route.ts
 * Added: Better Auth session validation
 *
 * POST /api/generate-pages
 *   Body: { title, pages: string[], characterImageB64?, refSeed?, style? }
 *   Returns: { genId, total }
 *
 * GET /api/generate-pages?genId=xxx
 *   Returns: { status, total, completed, pages: [{index, status, imageB64?}] }
 */

// In-memory store for generation progress (same pattern as BookBunny)
// TODO: In production, use Redis or database for multi-instance support
const store = new Map<
  string,
  {
    total: number;
    completed: number;
    status: string;
    pages: { index: number; status: string; imageB64?: string }[];
  }
>();

/**
 * POST - Start image generation for all pages
 */
export async function POST(req: NextRequest) {
  // 1. Validate session
  const session = await requireSession(req);
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const { title, pages, characterImageB64, refSeed, style } =
      await req.json();

    if (!pages || !Array.isArray(pages)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request: pages array required' },
        { status: 400 }
      );
    }

    const genId = `gen_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    store.set(genId, {
      total: pages.length,
      completed: 0,
      status: 'running',
      pages: pages.map(() => ({ index: 0, status: 'pending' })),
    });

    console.log(
      `[generate-pages] start user=${session.user.id} genId=${genId} title="${title}" pages=${pages.length}`
    );

    // Fire and forget - run generation in background
    runGeneration(genId, pages, characterImageB64, style).catch((err) => {
      console.error(`[generate-pages] fatal error genId=${genId}:`, err);
      const state = store.get(genId);
      if (state) state.status = 'error';
    });

    return NextResponse.json({ genId, total: pages.length });
  } catch (err) {
    console.error('[generate-pages] error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Generation failed',
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Poll generation progress
 */
export async function GET(req: NextRequest) {
  const genId = req.nextUrl.searchParams.get('genId');
  const state = genId ? store.get(genId) : null;

  if (!state) {
    return NextResponse.json(
      { success: false, error: 'Generation not found' },
      { status: 404 }
    );
  }

  const done = state.status === 'done' || state.status === 'error';
  const result = {
    status: state.status,
    total: state.total,
    completed: state.completed,
    pages: state.pages.map((p) => ({
      index: p.index,
      status: p.status,
      imageB64: p.status === 'done' ? p.imageB64 : undefined,
    })),
  };

  // Clean up store 10s after completion
  if (done && genId) {
    setTimeout(() => store.delete(genId), 10000);
  }

  return NextResponse.json(result);
}

/**
 * Run image generation for all pages sequentially
 * Uses FLUX model via OpenRouter
 */
async function runGeneration(
  genId: string,
  pages: string[],
  characterImageB64?: string,
  style?: string
) {
  const state = store.get(genId);
  if (!state) return;

  const styleSuffix = style || DEFAULT_STYLE;

  for (let i = 0; i < pages.length; i++) {
    const text =
      typeof pages[i] === 'string'
        ? pages[i]
        : (pages[i] as { text?: string })?.text || '';

    state.pages[i] = { index: i, status: 'generating' };

    try {
      const result = await generateImage(
        `${text}${styleSuffix}`,
        characterImageB64 || undefined
      );

      if (result.type === 'b64') {
        state.pages[i] = { index: i, status: 'done', imageB64: result.data };
      } else if (result.type === 'url') {
        // For URL results, we'd need to fetch and convert to base64
        // For now, store the URL directly
        const res = await fetch(result.data);
        const buf = Buffer.from(await res.arrayBuffer());
        state.pages[i] = {
          index: i,
          status: 'done',
          imageB64: buf.toString('base64'),
        };
      }
    } catch (err) {
      console.error(`[generate-pages] page ${i} failed:`, err);
      state.pages[i] = { index: i, status: 'failed' };
    }

    state.completed = state.pages.filter(
      (p) => p.status === 'done' || p.status === 'failed'
    ).length;
  }

  state.status = state.pages.every((p) => p.status === 'done')
    ? 'done'
    : 'error';

  console.log(
    `[generate-pages] complete genId=${genId} status=${state.status} done=${state.pages.filter((p) => p.status === 'done').length}/${state.total}`
  );
}
