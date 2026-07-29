import { NextResponse } from 'next/server';

/**
 * Validates Basic Authentication for cron job endpoints
 * @param request - The incoming request
 * @returns true if authentication is valid, false otherwise
 */
export function validateBasicAuth(request: Request): boolean {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false;
  }

  // Extract credentials from Authorization header
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString(
    'utf-8'
  );
  const [username, password] = credentials.split(':');

  // Validate against environment variables
  const expectedUsername = process.env.CRON_JOBS_USERNAME;
  const expectedPassword = process.env.CRON_JOBS_PASSWORD;

  if (!expectedUsername || !expectedPassword) {
    console.error(
      'Basic auth credentials not configured in environment variables'
    );
    return false;
  }

  return username === expectedUsername && password === expectedPassword;
}

/**
 * Returns an unauthorized response for cron job endpoints
 * @param jobName - Name of the cron job for logging
 * @returns NextResponse with 401 status
 */
export function unauthorizedResponse(jobName: string): NextResponse {
  console.error(`${jobName} unauthorized`);
  return new NextResponse('Unauthorized', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  });
}
