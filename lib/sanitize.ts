import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks
 * Works in both server-side and client-side contexts
 * @param dirty - The untrusted HTML string to sanitize
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizeHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'span'
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Sanitizes Algolia search highlight HTML with minimal allowed tags
 * Converts Algolia's <em> tags to <span class="matched_item">
 * @param dirty - The highlighted HTML from Algolia
 * @returns Sanitized HTML string with search highlights
 */
export function sanitizeSearchHighlight(dirty: string): string {
  if (!dirty) return '';

  // First replace Algolia's em tags with our span class
  const withCustomTags = dirty
    .replaceAll("<em>", "<span class='matched_item'>")
    .replaceAll("</em>", "</span>");

  // Then sanitize, allowing only span with class attribute
  return DOMPurify.sanitize(withCustomTags, {
    ALLOWED_TAGS: ['span'],
    ALLOWED_ATTR: ['class'],
    ALLOW_DATA_ATTR: false,
  });
}
