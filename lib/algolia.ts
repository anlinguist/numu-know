import algoliasearch from 'algoliasearch';

if (!process.env.ALGOLIA_APP_ID || !process.env.ALGOLIA_API_KEY) {
  throw new Error('ALGOLIA_APP_ID and ALGOLIA_API_KEY environment variables are required');
}

const client = algoliasearch(
  process.env.ALGOLIA_APP_ID,
  process.env.ALGOLIA_API_KEY
);

export const searchIndex = client.initIndex('numu-know-documents');
export const sentencesIndex = client.initIndex('numu-know-sentences');
export default client;
