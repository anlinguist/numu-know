import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';
import { verifyAuth } from '@/lib/middleware/auth';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Rate limiting - moderate for authenticated user actions
    const rateLimitResponse = rateLimit(request, { windowMs: 60000, maxRequests: 10 });
    if (rateLimitResponse) return rateLimitResponse;

    const auth = await verifyAuth(request);

    if (!auth.authenticated || !auth.uid) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const KLAVIYO_API_KEY = process.env.KLAVIYO_API_KEY;
    if (!KLAVIYO_API_KEY) {
      throw new Error('KLAVIYO_API_KEY not configured');
    }

    const adminAuth = getAdminAuth();
    const userRecord = await adminAuth.getUser(auth.uid).catch(() => null);
    if (!userRecord) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const email = userRecord.email;

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email not found' }, { status: 400 });
    }

    // Create profile in Klaviyo
    const klaviyoUrl = 'https://a.klaviyo.com/api/profiles/';
    const requestOptions = {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${KLAVIYO_API_KEY}`,
        'revision': '2022-10-17',
        'accept': 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          type: 'profile',
          attributes: { email, properties: {} },
        },
      }),
    };

    await fetch(klaviyoUrl, requestOptions);

    // Send welcome event
    const welcomeEventUrl = 'https://a.klaviyo.com/api/events/';
    const welcomeEventOptions = {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'revision': '2023-01-24',
        'content-type': 'application/json',
        'Authorization': `Klaviyo-API-Key ${KLAVIYO_API_KEY}`,
      },
      body: JSON.stringify({
        data: {
          type: 'event',
          attributes: {
            profile: { email },
            metric: { name: 'numuKnowWelcome' },
            properties: { welcome: 'welcome' },
          },
        },
      }),
    };

    await fetch(welcomeEventUrl, welcomeEventOptions);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to process request' }, { status: 500 });
  }
}
