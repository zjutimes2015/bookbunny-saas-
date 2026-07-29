import { requireSession, unauthorizedResponse } from '@/lib/require-session';
import { type NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

/**
 * Export Video API
 *
 * Migrated from BookBunny's app/api/export-video/route.ts
 * Added: Better Auth session validation
 * Changed: Use os.tmpdir() instead of /tmp (Windows compatibility)
 *         Pass imageB64 to Python service for richer video frames
 *
 * POST /api/export-video
 * Body: { title, pages: string[] | { text, imageB64? }[] }
 * Returns: MP4 file (video/mp4) or HTML fallback
 */
export async function POST(req: NextRequest) {
  // 1. Validate session
  const session = await requireSession(req);
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const body = await req.json();
    const { title, pages } = body;

    if (!title || !pages || !Array.isArray(pages)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request: title and pages required' },
        { status: 400 }
      );
    }

    console.log(
      `[export-video] user=${session.user.id} title="${title}" pages=${pages.length}`
    );

    // Normalize pages: accept string[] or { text, imageB64? }[]
    const bookData = {
      title,
      pages: pages.map(
        (p: string | { text: string; imageB64?: string }) =>
          typeof p === 'string' ? { text: p } : p
      ),
    };

    // Use OS temp directory for cross-platform compatibility
    const tmpInput = join(tmpdir(), `bookbunny_vid_${Date.now()}_input.json`);
    const tmpOutput = join(tmpdir(), `bookbunny_vid_${Date.now()}.mp4`);
    writeFileSync(tmpInput, JSON.stringify(bookData));

    try {
      const videoServicePath = join(process.cwd(), 'pdf-service', 'video.py');

      // Try Python 3 first, fall back to python
      let pythonCmd = 'python3';
      try {
        execSync('python3 --version', { stdio: 'pipe' });
      } catch {
        pythonCmd = 'python';
        execSync('python --version', { stdio: 'pipe' });
      }

      execSync(`"${pythonCmd}" "${videoServicePath}" "${tmpInput}" "${tmpOutput}"`, {
        timeout: 60000,
        stdio: 'pipe',
      });

      // Read the generated file
      const fs = await import('fs/promises');
      const buf = await fs.readFile(tmpOutput);

      // Cleanup temp files
      try { unlinkSync(tmpInput); } catch {}
      try { unlinkSync(tmpOutput); } catch {}

      // If Python wrote an HTML fallback instead of MP4
      if (tmpOutput.endsWith('.html') || buf.slice(0, 5).toString('utf-8') === '<!DOC') {
        console.log('[export-video] returning HTML fallback');
        return new NextResponse(buf.toString('utf-8'), {
          headers: {
            'Content-Type': 'text/html',
            'Content-Disposition': `attachment; filename="${title.replace(/[^a-zA-Z0-9]/g, '_')}.html"`,
          },
        });
      }

      console.log(
        `[export-video] success user=${session.user.id} size=${buf.length}bytes`
      );

      return new NextResponse(buf, {
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Disposition': `attachment; filename="${title.replace(/[^a-zA-Z0-9]/g, '_')}.mp4"`,
          'Content-Length': buf.length.toString(),
        },
      });
    } catch (pyErr) {
      try { unlinkSync(tmpInput); } catch {}
      try { unlinkSync(tmpOutput); } catch {}

      console.error('[export-video] Python service error:', pyErr);
      return NextResponse.json(
        {
          success: false,
          error:
            'Video generation failed. Ensure ffmpeg is installed on the server.',
        },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error('[export-video] error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Video export failed',
      },
      { status: 500 }
    );
  }
}
