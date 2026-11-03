// Dev seed content (globalhost P1-10). Invented placeholder text in the app's real data shapes; nothing here is
// copied from production and none of it is real Numu. Every Firestore document the seed writes comes from this file.

// Words are artificial `fx-` tokens so nobody mistakes them for the language. Punctuation entries are
// `{ punctuation }` only, as the story creator writes them. A word may be [gloss, extra fields], for the optional
// fields real words carry (notes, variant-* spellings).
const word = (w) => {
  const [gloss, extra] = Array.isArray(w) ? w : [w, {}];
  return gloss === '.' ? { punctuation: '.' } : { word: `fx-${gloss.replace(/ /g, '-')}`, gloss, morphology: 'FIX', ...extra };
};

function story(title, sentences, extra = {}) {
  return {
    title,
    ...extra,
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
    // Has audio (a generated tone, see toneWav), so the story page shows the player.
    story(
      'Fixture Story Four: With Audio',
      [
        [[['drum', { notes: 'Placeholder note on a fixture word.', 'variant-Modified IPA': 'fx-drum-ipa' }], 'sound', '.'], 'The drum sounds.'],
        [['song', 'end'], 'The song ends.'],
      ],
      { audio: { hz: 440, seconds: 2 } },
    ),
  ],
  drafts: [
    story('Fixture Draft One', [[['sit', 'here'], 'Sit here.']]),
  ],
};

/**
 * A quiet sine tone as a 16-bit mono PCM WAV, with short fades so it doesn't click. Generated, so the repo holds
 * no audio file and nothing resembling speech. Deterministic: the same arguments give the same bytes.
 */
export function toneWav({ hz, seconds, sampleRate = 8000, amplitude = 0.2 }) {
  const n = Math.round(seconds * sampleRate);
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8, 'ascii');
  buf.write('fmt ', 12, 'ascii');
  buf.writeUInt32LE(16, 16); // fmt chunk size
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buf.writeUInt16LE(2, 32); // block align
  buf.writeUInt16LE(16, 34); // bits per sample
  buf.write('data', 36, 'ascii');
  buf.writeUInt32LE(n * 2, 40);
  const fade = Math.round(sampleRate * 0.05);
  for (let i = 0; i < n; i++) {
    const envelope = Math.min(1, i / fade, (n - 1 - i) / fade);
    buf.writeInt16LE(Math.round(32767 * amplitude * envelope * Math.sin((2 * Math.PI * hz * i) / sampleRate)), 44 + i * 2);
  }
  return buf;
}

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
