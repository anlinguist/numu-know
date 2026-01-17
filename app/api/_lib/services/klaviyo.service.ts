// Klaviyo Service - Business logic for Klaviyo API interactions
// Following NestJS-like pattern: Service layer for reusable business logic

import { logger } from '@/lib/logger';

export interface KlaviyoProfile {
  email: string;
  properties?: Record<string, unknown>;
}

export interface KlaviyoEvent {
  email: string;
  metric: string;
  properties?: Record<string, unknown>;
}

/**
 * Service class for Klaviyo API operations
 */
export class KlaviyoService {
  private apiKey: string;
  private readonly baseUrl = 'https://a.klaviyo.com/api';

  constructor() {
    const apiKey = process.env.KLAVIYO_API_KEY;
    if (!apiKey) {
      throw new Error('KLAVIYO_API_KEY is not configured');
    }
    this.apiKey = apiKey;
  }

  /**
   * Create or update a profile in Klaviyo
   */
  async createProfile(profile: KlaviyoProfile): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/profiles/`, {
        method: 'POST',
        headers: {
          'Authorization': `Klaviyo-API-Key ${this.apiKey}`,
          'revision': '2022-10-17',
          'accept': 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            type: 'profile',
            attributes: {
              email: profile.email,
              properties: profile.properties || {},
            },
          },
        }),
      });

      if (!response.ok) {
        logger.error('Klaviyo create profile failed', undefined, {
          status: response.status,
          email: profile.email,
        });
        return false;
      }

      logger.info('Klaviyo profile created', { email: profile.email });
      return true;
    } catch (error) {
      logger.error('Klaviyo create profile error', error, { email: profile.email });
      return false;
    }
  }

  /**
   * Track an event in Klaviyo
   */
  async trackEvent(event: KlaviyoEvent): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/events/`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'revision': '2023-01-24',
          'content-type': 'application/json',
          'Authorization': `Klaviyo-API-Key ${this.apiKey}`,
        },
        body: JSON.stringify({
          data: {
            type: 'event',
            attributes: {
              profile: { email: event.email },
              metric: { name: event.metric },
              properties: event.properties || {},
            },
          },
        }),
      });

      if (!response.ok) {
        logger.error('Klaviyo track event failed', undefined, {
          status: response.status,
          metric: event.metric,
          email: event.email,
        });
        return false;
      }

      logger.info('Klaviyo event tracked', { metric: event.metric, email: event.email });
      return true;
    } catch (error) {
      logger.error('Klaviyo track event error', error, {
        metric: event.metric,
        email: event.email,
      });
      return false;
    }
  }

  /**
   * Send welcome event to new subscriber
   */
  async sendWelcome(email: string): Promise<boolean> {
    const profileCreated = await this.createProfile({ email });
    if (!profileCreated) {
      return false;
    }

    return await this.trackEvent({
      email,
      metric: 'numuKnowWelcome',
      properties: { welcome: 'welcome' },
    });
  }

  /**
   * Notify subscribers about a new story
   */
  async notifyNewStory(
    subscribers: string[],
    storyTitle: string,
    storyExcerpt: string,
    storyLink: string
  ): Promise<number> {
    let successCount = 0;

    await Promise.allSettled(
      subscribers.map(async (email) => {
        const success = await this.trackEvent({
          email,
          metric: 'newStory',
          properties: {
            title: storyTitle,
            content: storyExcerpt,
            link: storyLink,
          },
        });
        if (success) successCount++;
      })
    );

    logger.info('New story notifications sent', {
      storyTitle,
      subscribers: subscribers.length,
      successful: successCount,
    });

    return successCount;
  }

  /**
   * Notify subscribers about a new blog post
   */
  async notifyNewBlogPost(
    subscribers: string[],
    postTitle: string,
    postExcerpt: string,
    postLink: string
  ): Promise<number> {
    let successCount = 0;

    await Promise.allSettled(
      subscribers.map(async (email) => {
        const success = await this.trackEvent({
          email,
          metric: 'newBlogPost',
          properties: {
            title: postTitle,
            excerpt: postExcerpt,
            link: postLink,
          },
        });
        if (success) successCount++;
      })
    );

    logger.info('New blog post notifications sent', {
      postTitle,
      subscribers: subscribers.length,
      successful: successCount,
    });

    return successCount;
  }
}

// Singleton instance
let klaviyoServiceInstance: KlaviyoService | null = null;

/**
 * Get or create Klaviyo service instance
 */
export function getKlaviyoService(): KlaviyoService {
  if (!klaviyoServiceInstance) {
    klaviyoServiceInstance = new KlaviyoService();
  }
  return klaviyoServiceInstance;
}
