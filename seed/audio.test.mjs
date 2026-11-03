// node --test: the dev seed's fixture story with audio (issue #35). The seed uploads a generated tone (never real
// speech) to the dev project's storage, at the path the story page looks for it.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
import { STORIES } from './fixtures.mjs';
import { assertDevBucket, defaultBucket, uploads } from './seed-dev.mjs';

// Load an import-free TypeScript module by transpiling it (CI runs Node 20, which can't run .ts itself).
async function loadTs(file) {
  const src = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}

const { storyAudioPath } = await loadTs('lib/story-audio.ts');
const BUCKET = 'numu-know-dev.firebasestorage.app';

/** Minimal RIFF/WAVE reader: enough to prove the file is a playable PCM WAV and how long it is. */
function readWav(buf) {
  assert.equal(buf.toString('ascii', 0, 4), 'RIFF');
  assert.equal(buf.readUInt32LE(4), buf.length - 8, 'RIFF size');
  assert.equal(buf.toString('ascii', 8, 12), 'WAVE');
  assert.equal(buf.toString('ascii', 12, 16), 'fmt ');
  const fmt = {
    format: buf.readUInt16LE(20),
    channels: buf.readUInt16LE(22),
    sampleRate: buf.readUInt32LE(24),
    byteRate: buf.readUInt32LE(28),
    blockAlign: buf.readUInt16LE(32),
    bits: buf.readUInt16LE(34),
  };
  assert.equal(buf.toString('ascii', 36, 40), 'data');
  const dataLen = buf.readUInt32LE(40);
  assert.equal(dataLen, buf.length - 44, 'data size');
  assert.equal(fmt.byteRate, fmt.sampleRate * fmt.blockAlign);
  return { ...fmt, seconds: dataLen / fmt.byteRate };
}

test('at least one live fixture story has audio, and no draft does', () => {
  const live = new Set(STORIES.live.map((s) => s.title));
  const audio = uploads(BUCKET);
  assert.ok(audio.length >= 1, 'at least one audio upload');
  for (const u of audio) assert.ok(live.has(u.story), `${u.story} is a live fixture story`);
});

test('audio goes to the dev bucket at the path the story page reads', () => {
  for (const u of uploads(BUCKET)) {
    assert.equal(u.bucket, BUCKET);
    assert.equal(u.path, storyAudioPath(u.story));
    assert.equal(u.contentType, 'audio/wav');
  }
});

test('the audio is a short generated PCM WAV tone', () => {
  for (const u of uploads(BUCKET)) {
    assert.ok(Buffer.isBuffer(u.data));
    assert.ok(u.data.length < 200_000, 'small file');
    const wav = readWav(u.data);
    assert.equal(wav.format, 1, 'PCM');
    assert.equal(wav.channels, 1);
    assert.equal(wav.bits, 16);
    assert.ok(wav.seconds >= 1 && wav.seconds <= 5, `${wav.seconds}s`);
    // Audible but quiet: a tone, not silence and not clipped.
    let peak = 0;
    for (let i = 44; i < u.data.length; i += 2) peak = Math.max(peak, Math.abs(u.data.readInt16LE(i)));
    assert.ok(peak > 1000 && peak < 32767 * 0.5, `peak ${peak}`);
  }
});

test('uploads are deterministic, so re-seeding overwrites the same objects with the same bytes', () => {
  const a = uploads(BUCKET);
  const b = uploads(BUCKET);
  assert.deepEqual(a.map((u) => u.path), b.map((u) => u.path));
  for (let i = 0; i < a.length; i++) assert.ok(a[i].data.equals(b[i].data));
});

test("only the dev project's own default buckets are accepted", () => {
  assert.equal(defaultBucket('numu-know-dev'), BUCKET);
  assert.doesNotThrow(() => assertDevBucket(BUCKET, 'numu-know-dev'));
  assert.doesNotThrow(() => assertDevBucket('numu-know-dev.appspot.com', 'numu-know-dev'));
  for (const b of ['numu-know.appspot.com', 'numu-know.firebasestorage.app', 'other-dev.firebasestorage.app', 'numu-know-dev', '', undefined]) {
    assert.throws(() => assertDevBucket(b, 'numu-know-dev'), /bucket/, String(b));
  }
  assert.throws(() => assertDevBucket('numu-know.appspot.com', 'numu-know'), /-dev/);
});

test('the seed writes storage objects only under stories/', () => {
  for (const u of uploads(BUCKET)) assert.match(u.path, /^stories\/[^/]+\/[^/]+\.wav$/);
  // Storage reads are as off-limits as Firestore reads: the seed only writes.
  const src = readFileSync(new URL('./seed-dev.mjs', import.meta.url), 'utf8');
  for (const read of ['.download(', '.exists(', '.getFiles(', 'getMetadata', 'createReadStream']) {
    assert.ok(!src.includes(read), `seed-dev.mjs must not read storage (${read})`);
  }
});

test('punctuation entries have the shape the story creator writes ({ punctuation } only)', () => {
  for (const s of [...STORIES.live, ...STORIES.drafts]) {
    for (const el of s.data) {
      for (const w of el.words ?? []) {
        if ('punctuation' in w) assert.deepEqual(Object.keys(w), ['punctuation'], `${s.title}: ${JSON.stringify(w)}`);
        else assert.equal(typeof w.word, 'string');
      }
    }
  }
});
