// API client for internal Next.js API routes
import type { StoryContent } from '@/types/story';

export const api = {
  queryNumu: async (q_type: string, q_word: string) => {
    const response = await fetch('/api/queryNumu', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q_type, q_word }),
    });
    return response.json();
  },

  userSubscribed: async (uid: string) => {
    const response = await fetch('/api/userSubscribed', {
      method: 'GET',
      headers: {
        uid,
      },
    });
    return response.json();
  },

  newStory: async (uid: string, story_title: string, story_content: StoryContent) => {
    const response = await fetch('/api/newStory', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        uid,
      },
      body: JSON.stringify({ story_title, story_content }),
    });
    return response.json();
  },

  getYTVideos: async () => {
    const response = await fetch('/api/getYTVideos', {
      method: 'GET',
    });
    return response.json();
  },
};

export default api;
