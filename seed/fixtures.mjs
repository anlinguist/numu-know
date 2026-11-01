// Dev seed content (globalhost P1-10). Invented placeholder text in the app's real data shapes; nothing here is
// copied from production and none of it is real Numu. Every Firestore document the seed writes comes from this file.

// Words are artificial `fx-` tokens so nobody mistakes them for the language.
const word = (gloss) => (gloss === '.' ? { word: '', punctuation: '.' } : { word: `fx-${gloss.replace(/ /g, '-')}`, gloss, morphology: 'FIX' });

function story(title, sentences) {
  return {
    title,
    data: [
      { block: `${title}: a placeholder story for development and previews. It is not real Numu text.` },
      ...sentences.map(([words, translation]) => ({ words: words.map(word), translation })),
    ],
  };
}

export const STORIES = {
  live: [
    story('Fixture Story One', [
      [['sun', 'rise', '.'], 'The sun rises.'],
      [['three', 'bird', 'sing'], 'Three birds sing.'],
    ]),
    story('Fixture Story Two', [
      [['water', 'come'], 'The water comes.'],
      [['mountain', 'tall'], 'The mountain is tall.'],
      [['that one', 'walk', 'water', 'toward'], 'That one walks toward the water.'],
    ]),
    // Long title and apostrophe: exercises URL encoding and layout.
    story("Fixture Story Three: A Longer Title With an Apostrophe's Edge Case", [
      [['wind', 'blow'], 'The wind blows.'],
    ]),
  ],
  drafts: [
    story('Fixture Draft One', [[['sit', 'here'], 'Sit here.']]),
  ],
};

// A grey 16:9 SVG thumbnail as a data URI (the CSP allows data: images), so dev needs no image host.
const THUMB =
  'data:image/svg+xml;base64,' +
  Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#9ca3af"/></svg>').toString('base64');

// Ids have YouTube's format (11 characters) so the Learn page lists them; they don't play.
export const YT_VIDEOS = [
  { id: 'fixtureVid1', title: 'Fixture video: greetings', description: 'Placeholder video for development.', publish_date: '2026-01-15T00:00:00Z' },
  { id: 'fixtureVid2', title: 'Fixture video: numbers', description: 'Placeholder video for development.', publish_date: '2026-02-20T00:00:00Z' },
  { id: 'fixtureVid3', title: 'Fixture video: a story read aloud', description: 'Placeholder video for development.', publish_date: '2026-03-25T00:00:00Z' },
].map((v) => ({ ...v, image: THUMB }));

// Auth test users. Passwords never live in the repo: the seed reads them from the environment.
export const TEST_USERS = [
  { email: 'admin@numu-know-dev.test', displayName: 'Dev Admin', admin: true, passwordEnv: 'SEED_ADMIN_PASSWORD' },
  { email: 'reader@numu-know-dev.test', displayName: 'Dev Reader', admin: false, passwordEnv: 'SEED_READER_PASSWORD' },
];
