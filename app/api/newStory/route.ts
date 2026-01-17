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
    const { story_title, story_content } = data;

    // Extract story excerpt from block elements
    let story_excerpt = '';
    for (const element of story_content) {
      if (element['block']) {
        let block_content_string = element['block'];
        const block_content_string_no_backticks = block_content_string.replace(/`/g, '');
        if (block_content_string_no_backticks.length > 0) {
          story_excerpt += block_content_string_no_backticks + ' ';
        }
      } else {
        break;
      }
    }

    const story_title_encoded = encodeURIComponent(story_title);
    const story_link = `${APP_DOMAIN}/stories/${story_title_encoded}`;

    const KLAVIYO_API_KEY = process.env.KLAVIYO_API_KEY;
    if (!KLAVIYO_API_KEY) {
      throw new Error('KLAVIYO_API_KEY not configured');
    }

    // Send notifications to subscribed users
    const usersRef = db.collection('users');
    const usersQuery = await usersRef.where('newStories', '==', true).get();

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
              metric: { name: 'newStory' },
              properties: {
                title: story_title,
                content: story_excerpt,
                link: story_link,
              },
            },
          },
        }),
      };

      await fetch(eventurl, eventoptions);
    }

    logger.info('Story notifications sent', { title: story_title, recipients: usersQuery.size });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error in newStory', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
