// node --test: the seed's safety properties (globalhost P1-10).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { STORIES, YT_VIDEOS } from './fixtures.mjs';
import { assertDevProject, plan } from './seed-dev.mjs';

test('refuses any project that is not a -dev project', () => {
  for (const id of ['numu-know', 'numu-know-prod', 'numu-know-dev-x', '', undefined, 'dev']) {
    assert.throws(() => assertDevProject(id), /must end in "-dev"/, String(id));
  }
  assert.doesNotThrow(() => assertDevProject('numu-know-dev'));
});

test('reads nothing from Firestore: every write comes from the fixtures', () => {
  const src = readFileSync(new URL('./seed-dev.mjs', import.meta.url), 'utf8');
  for (const read of ['.get(', 'getDoc', 'getDocs', '.listDocuments(', '.where(', 'onSnapshot', 'getAll(']) {
    assert.ok(!src.includes(read), `seed-dev.mjs must not read Firestore (${read})`);
  }
  const paths = plan().map(([p]) => p);
  assert.deepEqual(paths.filter((p) => p.startsWith('documents/')), STORIES.live.map((s) => `documents/${s.title}`));
  assert.equal(paths.filter((p) => p.startsWith('ytvids/')).length, YT_VIDEOS.length);
  assert.ok(paths.every((p) => /^(documents|drafts|allDocuments|ytvids)\//.test(p)), 'only fixture collections');
});

test('fixtures match the shapes the app reads', () => {
  for (const s of [...STORIES.live, ...STORIES.drafts]) {
    assert.ok(!s.title.includes('/'), 'Firestore ids cannot contain /');
    for (const el of s.data) assert.ok('block' in el || (Array.isArray(el.words) && typeof el.translation === 'string'));
  }
  for (const v of YT_VIDEOS) assert.match(v.id, /^[A-Za-z0-9_-]{11}$/, 'Learn only lists valid YouTube ids');
});
