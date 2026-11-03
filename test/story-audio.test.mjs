// node --test: the story page finds audio in the build's own storage bucket and the CSP lets it play (issue #35).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';

const root = new URL('..', import.meta.url).pathname;
const read = (file) => readFileSync(join(root, file), 'utf8');

// Load an import-free TypeScript module by transpiling it (CI runs Node 20, which can't run .ts itself).
async function loadTs(file) {
  const { outputText } = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}

const { storyAudioBucket, storyAudioPath, storyAudioUrl } = await loadTs('lib/story-audio.ts');

test('the audio bucket comes from the build config, not a hardcoded project', () => {
  assert.equal(storyAudioBucket({ NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'numu-know-dev.firebasestorage.app' }), 'numu-know-dev.firebasestorage.app');
  assert.equal(
    storyAudioBucket({ FIREBASE_STORAGE_BUCKET: 'a-dev.appspot.com', NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'b-dev.appspot.com' }),
    'a-dev.appspot.com',
    'FIREBASE_STORAGE_BUCKET overrides, like FIREBASE_PROJECT_ID does'
  );
  for (const v of [undefined, '', 'gs://x', 'a/b', 'has space']) {
    assert.equal(storyAudioBucket({ NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: v }), null, String(v));
  }
});

test('the audio path and public URL are those the app has always used', () => {
  assert.equal(storyAudioPath('Fixture Story'), 'stories/Fixture Story/Fixture Story.wav');
  assert.equal(
    storyAudioUrl('numu-know-dev.firebasestorage.app', "A's tale"),
    "https://firebasestorage.googleapis.com/v0/b/numu-know-dev.firebasestorage.app/o/stories%2FA's%20tale%2FA's%20tale.wav?alt=media"
  );
});

test('getStoryAudioUrl no longer names the production bucket', () => {
  const src = read('app/actions/story-actions.ts');
  assert.ok(!src.includes('numu-know.appspot.com'), 'no hardcoded production bucket');
  assert.match(src, /storyAudioBucket\(/);
});

test('the CSP allows audio from Firebase Storage in dev and production', () => {
  const src = read('proxy.ts');
  const media = src.match(/"media-src [^"]*"/g) ?? [];
  assert.equal(media.length, 2, 'one media-src per branch');
  for (const m of media) {
    assert.ok(m.includes(" 'self'"), m);
    assert.ok(m.includes(' https://firebasestorage.googleapis.com'), m);
    assert.ok(!m.includes('*'), `${m}: no wildcards`);
  }
});
