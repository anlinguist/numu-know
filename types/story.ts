// Story and document-related types for the Numu-Know application

/**
 * Represents a single word in a sentence with its linguistic attributes
 * Some properties can be strings or objects with a value property (for Algolia compatibility)
 */
export interface Word {
  word?: string | { value: string };
  Word?: string | { value: string }; // Alternative capitalization from some data sources
  morphology?: string;
  gloss?: string;
  Gloss?: string; // Alternative capitalization
  punctuation?: string | { value: string };
  'variant-Burns'?: string;
  'variant-Modified IPA'?: string;
  Note?: string;
  note?: string;
  notes?: string;
  'Note.'?: string;
  [key: string]: string | { value: string } | undefined; // Allow custom attributes
}

/**
 * Represents an informational block (non-sentence content)
 */
export interface InformationalBlock {
  block: string;
}

/**
 * Represents a sentence containing words and a translation
 */
export interface Sentence {
  words: Word[];
  translation: string;
}

/**
 * Story content structure (array of sentences or informational blocks)
 */
export type StoryContent = (Sentence | InformationalBlock)[];

/**
 * Highlights object for search results
 * Maps sentence indices to arrays of word indices or strings
 * Can also have 't-{index}' keys for translation highlights
 */
export interface Highlights {
  [key: string]: number[] | string[] | boolean;
}

/**
 * User document from Firestore
 */
export interface UserDocument {
  admin?: boolean;
  [key: string]: unknown;
}

/**
 * Firebase user UID type
 */
export type UserUID = string | undefined;

/**
 * Story status in the system
 */
export type StoryStatus = 'draft' | 'live' | '';

/**
 * WordPress blog post structure
 */
export interface BlogPost {
  id: number;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
  };
  excerpt?: {
    rendered: string;
  };
  date: string;
  slug: string;
  tags: number[];
  [key: string]: unknown; // Allow other properties from WP API
}

/**
 * Algolia highlight result for a single field
 */
export interface AlgoliaHighlightResult {
  value: string;
  matchLevel: 'none' | 'partial' | 'full';
  matchedWords?: string[];
}

/**
 * Algolia highlight result structure
 */
export interface AlgoliaHighlightResults {
  block?: AlgoliaHighlightResult;
  translation?: AlgoliaHighlightResult;
  words?: Record<number, Record<string, AlgoliaHighlightResult>>;
  [key: string]: AlgoliaHighlightResult | Record<number, Record<string, AlgoliaHighlightResult>> | undefined;
}

/**
 * Algolia search hit result
 */
export interface AlgoliaSearchHit {
  objectID: string;
  storyID: string;
  storyTitle?: string;
  sIndex: number;
  words?: Word[];
  translation?: string | { value: string };
  block?: string | { value: string };
  _highlightResult?: AlgoliaHighlightResults;
}

/**
 * Grouped search results by story
 */
export interface GroupedSearchResults {
  [storyID: string]: {
    objectID: string;
    storyTitle: string;
    sentenceHits: AlgoliaSearchHit[];
  };
}

/**
 * New attribute being added to a word
 */
export interface NewAttribute {
  attributeName: string;
  attributeValue: string;
}

/**
 * Internal story line structure for Creator component
 */
export interface StoryLine {
  type: 'line' | 'block';
  rowContent: string;
  lineTranslation?: string;
  originalWords?: Word[];
}

/**
 * Welcome content structure from welcome.json
 */
export interface WelcomeContent {
  data: (Sentence | InformationalBlock)[];
}
