import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase-admin';
import { logger } from '@/lib/logger';
import { rateLimitPublic } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResponse = rateLimitPublic(request);
    if (rateLimitResponse) return rateLimitResponse;

    const API_KEY = process.env.YOUTUBE_API_KEY;
    if (!API_KEY) {
      throw new Error('YOUTUBE_API_KEY not configured');
    }

    const db = getDb();
    const channelId = 'UCxmFfRNHV15Wx5o2rKix2FQ';
    const url = `https://www.googleapis.com/youtube/v3/search?key=${API_KEY}&channelId=${channelId}&part=snippet,id&order=date&maxResults=50`;

    const raw = await fetch(url);
    const response = await raw.json();
    const video_arr = response['items'];

    for (const video of video_arr) {
      if ('videoId' in video['id']) {
        const video_id = video['id']['videoId'];
        const video_url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${video_id}&key=${API_KEY}`;

        const video_raw = await fetch(video_url);
        const video_response = await video_raw.json();
        const snippet = video_response['items'][0]['snippet'];

        const video_title = snippet['title'];
        const video_description = snippet['description'];
        const video_publish_date = snippet['publishedAt'];

        // Get best quality thumbnail
        let video_image;
        const thumbnails = snippet?.thumbnails;
        if (thumbnails?.maxres?.url) {
          video_image = thumbnails.maxres.url;
        } else if (thumbnails?.standard?.url) {
          video_image = thumbnails.standard.url;
        } else if (thumbnails?.high?.url) {
          video_image = thumbnails.high.url;
        } else if (thumbnails?.medium?.url) {
          video_image = thumbnails.medium.url;
        } else {
          video_image = thumbnails?.default?.url;
        }

        const video_data = {
          title: video_title,
          description: video_description,
          image: video_image,
          publish_date: video_publish_date,
        };

        await db.collection('ytvids').doc(video_id).set(video_data);
      }
    }

    logger.info('YouTube videos synced successfully', { count: video_arr.length });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error syncing YouTube videos', error);
    return NextResponse.json({ error: 'Failed to sync videos' }, { status: 500 });
  }
}
