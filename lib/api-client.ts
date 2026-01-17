// Enhanced API client with retry logic, error handling, and token management
import { auth } from '@/lib/firebase';
import { API_RETRY_ATTEMPTS, API_RETRY_DELAY_MS, API_TIMEOUT_MS } from './constants';
import type { StoryContent } from '@/types/story';

interface RequestConfig extends RequestInit {
  timeout?: number;
  retries?: number;
  requiresAuth?: boolean;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Get the current user's Firebase auth token
 */
async function getAuthToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    return await user.getIdToken();
  } catch (error) {
    return null;
  }
}

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch with timeout support
 */
async function fetchWithTimeout(
  url: string,
  config: RequestConfig
): Promise<Response> {
  const timeout = config.timeout || API_TIMEOUT_MS;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...config,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('Request timeout', 408, 'TIMEOUT');
    }
    throw error;
  }
}

/**
 * Enhanced fetch with retry logic and error handling
 */
async function apiFetch<T = unknown>(
  url: string,
  config: RequestConfig = {}
): Promise<T> {
  const {
    retries = API_RETRY_ATTEMPTS,
    requiresAuth = false,
    headers = {},
    ...fetchConfig
  } = config;

  // Add auth token if required
  const requestHeaders: Record<string, string> = { ...headers as Record<string, string> };
  if (requiresAuth) {
    const token = await getAuthToken();
    if (!token) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  // Add Content-Type for JSON requests
  if (fetchConfig.body && typeof fetchConfig.body === 'string') {
    requestHeaders['Content-Type'] = 'application/json';
  }

  let lastError: Error | null = null;

  // Retry logic
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, {
        ...fetchConfig,
        headers: requestHeaders,
      });

      // Handle non-OK responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.error || response.statusText,
          response.status,
          errorData.code
        );
      }

      // Parse JSON response
      const data = await response.json();
      return data as T;

    } catch (error) {
      lastError = error as Error;

      // Don't retry on client errors (4xx) except 429 (rate limit)
      if (error instanceof ApiError) {
        if (error.status && error.status >= 400 && error.status < 500 && error.status !== 429) {
          throw error;
        }
      }

      // If we have retries left, wait and try again
      if (attempt < retries) {
        await sleep(API_RETRY_DELAY_MS * (attempt + 1)); // Exponential backoff
        continue;
      }

      // No more retries, throw the error
      throw error;
    }
  }

  throw lastError || new ApiError('Unknown error occurred');
}

/**
 * API Client with all endpoints
 */
export const apiClient = {
  /**
   * Query Algolia search
   */
  queryNumu: async (
    q_type: string,
    q_word: string
  ): Promise<ApiResponse> => {
    return apiFetch('/api/queryNumu', {
      method: 'POST',
      body: JSON.stringify({ q_type, q_word }),
    });
  },

  /**
   * Subscribe user to notifications
   */
  userSubscribed: async (): Promise<ApiResponse> => {
    return apiFetch('/api/userSubscribed', {
      method: 'GET',
      requiresAuth: true,
    });
  },

  /**
   * Create a new story
   */
  newStory: async (
    story_title: string,
    story_content: StoryContent
  ): Promise<ApiResponse> => {
    return apiFetch('/api/newStory', {
      method: 'POST',
      body: JSON.stringify({ story_title, story_content }),
      requiresAuth: true,
    });
  },

  /**
   * Create a new blog post
   */
  newBlogPost: async (
    post_date: string,
    post_modified: string,
    post_title: string,
    post_content: string,
    post_name: string,
    post_excerpt?: string
  ): Promise<ApiResponse> => {
    return apiFetch('/api/newBlogPost', {
      method: 'POST',
      body: JSON.stringify({
        post_date,
        post_modified,
        post_title,
        post_content,
        post_name,
        post_excerpt,
      }),
      requiresAuth: true,
    });
  },

  /**
   * Get YouTube videos
   */
  getYTVideos: async (): Promise<ApiResponse> => {
    return apiFetch('/api/getYTVideos', {
      method: 'GET',
    });
  },
};

export default apiClient;
export { ApiError };
