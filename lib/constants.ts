// Application Constants

// Domain and URLs
export const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'https://numu-know.com';
export const WORDPRESS_BLOG_URL = process.env.WORDPRESS_BLOG_URL || 'https://public-api.wordpress.com/wp/v2/sites/sereneanlinguist.wordpress.com/posts';

// Story defaults
export const DEFAULT_STORY_AUTHOR = 'Natchez';
export const DEFAULT_STORY_VARIANT = 'McDermitt (Wycliffe)';

// Search limits
export const MAX_SEARCH_QUERY_LENGTH = 200;
export const MAX_SEARCH_RESULTS = 100;
export const DEFAULT_SEARCH_RESULTS_PER_PAGE = 20;

// API Configuration
export const API_RETRY_ATTEMPTS = 3;
export const API_RETRY_DELAY_MS = 1000;
export const API_TIMEOUT_MS = 30000;

// Rate Limiting
export const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
export const RATE_LIMIT_MAX_REQUESTS = 60; // 60 requests per minute

// File Upload
export const MAX_AUDIO_FILE_SIZE_MB = 50;
export const ALLOWED_AUDIO_FORMATS = ['audio/mpeg', 'audio/wav', 'audio/ogg'];

// Pagination
export const DEFAULT_PAGE_SIZE = 20;

// Cache TTL (in seconds)
export const CACHE_TTL_SHORT = 300; // 5 minutes
export const CACHE_TTL_MEDIUM = 1800; // 30 minutes
export const CACHE_TTL_LONG = 3600; // 1 hour
