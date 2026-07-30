import { unauthorizedResponse, validateBasicAuth } from '@/lib/cron-auth';
import { NextResponse } from 'next/server';

/**
 * Send daily greeting email to all users
 * This endpoint is designed to be called by a cron job (daily)
 *
 * Schedule: 8:00 AM US Eastern Time (America/New_York) daily
 *
 * Process:
 * 1. Validates basic auth
 * 2. If DAILY_EMAIL_TEST_RECIPIENT is set, only sends to that test email (for verification)
 * 3. Otherwise, fetches all users with verified email
 * 4. Sends personalized BookBunny greeting email to each user
 */
export async function GET(request: Request) {
  // Validate basic authentication
  if (!validateBasicAuth(request)) {
    return unauthorizedResponse('send daily email');
  }

  const jobName = 'send-daily-email';
  console.log(`>>> ${jobName} start`);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const createUrl = `${baseUrl}/create`;
  const myBooksUrl = `${baseUrl}/my-books`;

  const testRecipient = process.env.DAILY_EMAIL_TEST_RECIPIENT;

  try {
    const { Resend } = eval('require("resend")') as typeof import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    const subject = 'Ready to create a magical story today? - BookBunny';

    const buildHtml = (name: string) => `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Inter,Arial,sans-serif;background:#f4f4f5;padding:16px;margin:0;">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;padding:24px;">
<h1 style="font-size:24px;color:#18181b;margin:0 0 16px;">Hi, ${name}!</h1>
<p style="font-size:16px;color:#3f3f46;margin:0 0 12px;">Welcome back to BookBunny!</p>
<p style="font-size:16px;color:#3f3f46;margin:0 0 12px;">Every great children's book starts with a single idea. Today is the perfect day to bring your little one's imagination to life.</p>
<p style="font-size:15px;color:#52525b;margin:0 0 8px;">\u2022 Generate personalized stories with AI in seconds</p>
<p style="font-size:15px;color:#52525b;margin:0 0 8px;">\u2022 Add custom characters, themes, and illustrations</p>
<p style="font-size:15px;color:#52525b;margin:0 0 16px;">\u2022 Save and revisit your favorite stories anytime</p>
<p style="font-size:16px;color:#3f3f46;margin:0 0 16px;">Ready to create today's adventure?</p>
<a href="${createUrl}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:16px;font-weight:600;">Create a New Book</a>
<p style="font-size:14px;color:#71717a;margin:24px 0 0;">Or continue working on a story you've already started: <a href="${myBooksUrl}" style="color:#6366f1;text-decoration:underline;">View My Books</a></p>
<hr style="border:none;border-top:1px solid #e4e4e7;margin:32px 0;">
<p style="font-size:14px;color:#71717a;margin:0;">BookBunny Team</p>
</div>
</body>
</html>`;

    if (testRecipient) {
      console.log(`[test mode] Sending daily email to test recipient: ${testRecipient}`);
      const result = await resend.emails.send({
        from: 'BookBunny <support@celiafamily.com>',
        to: testRecipient,
        subject,
        html: buildHtml('BookBunny Friend'),
      });
      const success = !result.error;
      console.log(`>>> ${jobName} end (test mode), success: ${success}`);
      return NextResponse.json({
        success,
        message: `Test email sent to ${testRecipient}`,
        mode: 'test',
        recipient: testRecipient,
        data: result.data,
        error: result.error,
      });
    }

    const { getDb } = await import('@/db');
    const { user } = await import('@/db/schema');
    const { and, eq, isNotNull, ne } = await import('drizzle-orm');

    const db = await getDb();
    const users = await db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(user)
      .where(and(eq(user.emailVerified, true), isNotNull(user.email), ne(user.email, ''), ne(user.banned, true)));

    if (users.length === 0) {
      console.log('No users found to send daily email');
      return NextResponse.json({ success: true, message: 'No users found to send daily email', processedCount: 0, errorCount: 0, totalUsers: 0 });
    }

    console.log(`Found ${users.length} users to send daily email`);

    let processedCount = 0;
    let errorCount = 0;
    const errors: Array<{ email: string; error: string }> = [];

    for (const u of users) {
      try {
        const result = await resend.emails.send({
          from: 'BookBunny <support@celiafamily.com>',
          to: u.email,
          subject,
          html: buildHtml(u.name || 'BookBunny Friend'),
        });
        if (!result.error) {
          processedCount++;
          console.log(`Sent daily email to ${u.email}`);
        } else {
          console.warn(`Failed to send daily email to ${u.email}`);
          errors.push({ email: u.email, error: 'Send returned error' });
          errorCount++;
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error sending daily email to ${u.email}:`, errorMessage);
        errors.push({ email: u.email, error: errorMessage });
        errorCount++;
      }
    }

    console.log(`>>> ${jobName} end, processed: ${processedCount}, errors: ${errorCount}`);
    return NextResponse.json({
      success: true,
      message: `Daily email sending completed, processed: ${processedCount}, errors: ${errorCount}`,
      totalUsers: users.length,
      processedCount,
      errorCount,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    });
  } catch (error) {
    console.error(`Error in ${jobName}:`, error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to send daily email' }, { status: 500 });
  }
}
