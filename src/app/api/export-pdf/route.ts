import { execSync } from 'child_process';
import { unlinkSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { requireSession, unauthorizedResponse } from '@/lib/require-session';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Export PDF API
 *
 * Migrated from BookBunny's app/api/export-pdf/route.ts
 * Added: Better Auth session validation
 * Changed: Use os.tmpdir() instead of /tmp (Windows compatibility)
 *
 * POST /api/export-pdf
 * Body: { title, pages, author?, size? }
 * Returns: PDF file (application/pdf) or HTML fallback
 */
export async function POST(req: NextRequest) {
  // 1. Validate session
  const session = await requireSession(req);
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const body = await req.json();
    const { title, pages, author, size } = body;

    if (!title || !pages || !Array.isArray(pages)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request: title and pages required' },
        { status: 400 }
      );
    }

    console.log(
      `[export-pdf] user=${session.user.id} title="${title}" pages=${pages.length}`
    );

    // Format data for the PDF generator
    const bookData = {
      title,
      author: author || 'BookBunny',
      size: size || '8.5x8.5',
      pages: pages.map(
        (
          p: string | { text: string; characters?: string[]; imageB64?: string }
        ) => ({
          text: typeof p === 'string' ? p : p.text,
          characters: typeof p === 'string' ? [] : p.characters || [],
          imageB64: typeof p === 'string' ? undefined : p.imageB64,
        })
      ),
    };

    // Use OS temp directory for cross-platform compatibility
    const tmpInput = join(tmpdir(), `bookbunny_${Date.now()}_input.json`);
    const tmpOutput = join(tmpdir(), `bookbunny_${Date.now()}.pdf`);
    writeFileSync(tmpInput, JSON.stringify(bookData));

    try {
      const pdfServicePath = join(process.cwd(), 'pdf-service', 'generate.py');

      // Try Python 3 first, fall back to python
      let pythonCmd = 'python3';
      try {
        execSync('python3 --version', { stdio: 'pipe' });
      } catch {
        pythonCmd = 'python';
        execSync('python --version', { stdio: 'pipe' });
      }

      execSync(
        `"${pythonCmd}" "${pdfServicePath}" "${tmpInput}" "${tmpOutput}"`,
        {
          timeout: 30000,
          stdio: 'pipe',
        }
      );

      // Read the generated PDF
      const fs = await import('fs/promises');
      const pdfBuffer = await fs.readFile(tmpOutput);

      // Cleanup temp files
      try {
        unlinkSync(tmpInput);
      } catch {}
      try {
        unlinkSync(tmpOutput);
      } catch {}

      console.log(
        `[export-pdf] success user=${session.user.id} size=${pdfBuffer.length}bytes`
      );

      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`,
          'Content-Length': pdfBuffer.length.toString(),
        },
      });
    } catch (pyErr) {
      // Cleanup on Python error
      try {
        unlinkSync(tmpInput);
      } catch {}
      try {
        unlinkSync(tmpOutput);
      } catch {}

      console.error(
        '[export-pdf] Python service error, using HTML fallback:',
        pyErr
      );

      // Fallback: return HTML if Python PDF fails
      const fallbackHtml = generateFallbackHtml(bookData);
      return new NextResponse(fallbackHtml, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="${title.replace(/[^a-zA-Z0-9]/g, '_')}.html"`,
        },
      });
    }
  } catch (err) {
    console.error('[export-pdf] error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'PDF export failed',
      },
      { status: 500 }
    );
  }
}

/**
 * Generate a fallback HTML book when Python PDF service is unavailable
 */
function generateFallbackHtml(data: {
  title: string;
  author?: string;
  pages: { text: string; imageB64?: string }[];
}) {
  const title = data.title || 'My Book';
  const author = data.author || 'BookBunny';
  const pages = data.pages || [];

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>
  @page { margin: 0; size: 8.5in 8.5in; }
  body { margin: 0; font-family: Inter, -apple-system, sans-serif; }
  .page {
    width: 8.5in; height: 8.5in; display: flex; flex-direction: column;
    justify-content: center; align-items: center; page-break-after: always;
    background: #FFF5EE; padding: 0.75in; box-sizing: border-box;
  }
  .cover { background: linear-gradient(135deg, #FF6B8A 0%, #C8A2E8 50%, #87CEEB 100%); color: white; }
  h1 { font-size: 36pt; }
  h2 { font-size: 24pt; }
  .author { font-size: 14pt; opacity: 0.8; margin-top: 0.5in; }
  .text { font-size: 18pt; color: #2D2D2D; line-height: 1.6; text-align: center; max-width: 6in; }
  .img { max-width: 5in; max-height: 4in; margin-bottom: 0.25in; border-radius: 0.2in; }
</style></head><body>
  <div class="page cover">
    <h1>${title}</h1>
    <p class="author">by ${author}</p>
  </div>
  ${pages
    .map(
      (p) =>
        `<div class="page">${
          p.imageB64
            ? `<img class="img" src="data:image/png;base64,${p.imageB64}" />`
            : ''
        }<div class="text">${p.text}</div></div>`
    )
    .join('')}
  <div class="page cover"><h2>The End</h2></div>
</body></html>`;
}
