import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/middleware/auth';
import { logger } from '@/lib/logger';
import { rateLimitAdmin } from '@/lib/rate-limit';
import { APP_DOMAIN } from '@/lib/constants';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Rate limiting
    const rateLimitResponse = rateLimitAdmin(request);
    if (rateLimitResponse) return rateLimitResponse;

    // Authentication check - require admin privileges
    const authError = await requireAdmin(request);
    if (authError) return authError;

    const db = getDb();
    const data = await request.json();
    const { post_date, post_modified, post_title, post_content, post_name } = data;
    let { post_excerpt } = data;

    if (!post_excerpt || post_excerpt === '') {
      post_excerpt = post_content.substring(0, 200);
    }

    const post_link = `${APP_DOMAIN}/learn/${post_name}`;

    // Only send notifications if this is a new post
    if (post_date === post_modified) {
      const KLAVIYO_API_KEY = process.env.KLAVIYO_API_KEY;
      if (!KLAVIYO_API_KEY) {
        throw new Error('KLAVIYO_API_KEY not configured');
      }

      const usersRef = db.collection('users');
      const usersQuery = await usersRef.where('newBlogPosts', '==', true).get();

      for (const doc of usersQuery.docs) {
        const userData = doc.data();
        const userEmail = userData['email'];

        const eventurl = 'https://a.klaviyo.com/api/events/';
        const eventoptions = {
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
                profile: { email: userEmail },
                metric: { name: 'newBlogPost' },
                properties: {
                  title: post_title,
                  excerpt: post_excerpt,
                  link: post_link,
                },
              },
            },
          }),
        };

        await fetch(eventurl, eventoptions);
      }

      logger.info('Blog post notifications sent', { title: post_title, recipients: usersQuery.size });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error in newBlogPost', error);
    return NextResponse.json({ error: 'Failed to process' }, { status: 500 });
  }
}
