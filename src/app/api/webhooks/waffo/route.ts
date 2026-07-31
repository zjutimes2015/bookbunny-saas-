import { handleWebhookEvent } from '@/payment';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Waffo Pancake webhook handler
 * This endpoint receives webhook events from Waffo and processes them
 *
 * Configure the webhook URL in Waffo dashboard:
 * https://pancake.waffo.ai/merchant/settings/webhooks
 * Set the endpoint URL to: https://yourdomain.com/api/webhooks/waffo
 *
 * @param req The incoming request
 * @returns NextResponse
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  // Get the request body as text
  const payload = await req.text();

  // Get the Waffo signature from headers
  // Waffo uses X-Waffo-Signature header (HMAC-SHA256)
  const signature =
    req.headers.get('x-waffo-signature') ||
    req.headers.get('waffo-signature') ||
    '';

  try {
    // Validate inputs
    if (!payload) {
      return NextResponse.json(
        { error: 'Missing webhook payload' },
        { status: 400 }
      );
    }

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing Waffo signature' },
        { status: 400 }
      );
    }

    // Process the webhook event
    await handleWebhookEvent(payload, signature);

    // Return success
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Error in Waffo webhook route:', error);

    // Return error
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 }
    );
  }
}
