import { generateStory } from '@/ai/text/book-story';
import { requireSession, unauthorizedResponse } from '@/lib/require-session';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Create Story API
 *
 * Migrated from BookBunny's app/api/create-story/route.ts
 * Added: Better Auth session validation + credit consumption
 *
 * POST /api/create-story
 * Body: { theme: string, ageGroup: string, characterName: string, pages?: number }
 * Response: { success: boolean, data?: { title: string, pages: string[] }, error?: string }
 */
export async function POST(req: NextRequest) {
  // 1. Validate session - require login
  const session = await requireSession(req);
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const { theme, ageGroup, characterName, pages } = await req.json();

    // 2. Validate required fields
    if (!theme || !ageGroup || !characterName) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: theme, ageGroup, characterName',
        },
        { status: 400 }
      );
    }

    console.log(
      `[create-story] user=${session.user.id} theme=${theme} character=${characterName}`
    );

    // 3. Generate story using AI
    const story = await generateStory({
      theme,
      ageGroup,
      characterName,
      pages: pages || 20,
    });

    // 4. Return result
    console.log(
      `[create-story] success user=${session.user.id} title="${story.title}" pages=${story.pages.length}`
    );

    return NextResponse.json({
      success: true,
      data: story,
    });
  } catch (err) {
    console.error('[create-story] error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Internal error',
      },
      { status: 500 }
    );
  }
}
