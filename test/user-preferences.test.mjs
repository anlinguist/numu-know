// node --test: user notification preferences have one validated write path (issue #32).
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const root = new URL('..', import.meta.url).pathname;
const read = (file) => readFileSync(join(root, file), 'utf8');

function sources(dir) {
  return readdirSync(join(root, dir)).flatMap((name) => {
    const rel = join(dir, name);
    if (statSync(join(root, rel)).isDirectory()) return sources(rel);
    return /\.(ts|tsx|js|jsx|mjs)$/.test(name) ? [rel] : [];
  });
}

test('NavBar saves preferences through the updateUserPreferences server action', () => {
  const src = read('components/Navigation/NavBar.tsx');
  assert.match(src, /import\s*\{[^}]*\bupdateUserPreferences\b[^}]*\}\s*from\s*['"]@\/app\/actions\/story-actions['"]/);
  assert.match(src, /updateUserPreferences\(/);
  for (const write of ['updateDoc', 'setDoc', 'deleteField', 'addDoc', 'writeBatch', 'runTransaction']) {
    assert.ok(!src.includes(write), `NavBar must not write Firestore directly (${write})`);
  }
});

test('no client code writes user documents directly', () => {
  for (const file of [...sources('components'), ...sources('app'), ...sources('lib')]) {
    const src = read(file);
    if (!src.includes("'use client'") && !src.includes('"use client"')) continue;
    for (const line of src.split('\n')) {
      if (/(updateDoc|setDoc|deleteDoc)\s*\(/.test(line) && /users/.test(line)) {
        assert.fail(`${file} writes a user document from the client: ${line.trim()}`);
      }
    }
  }
});

test('the server action is the only server-side writer of user documents', () => {
  const writers = [...sources('app'), ...sources('lib')].filter((file) =>
    /collection\(\s*['"]users['"]\s*\)\s*\.doc\([^)]*\)\s*\.(update|set|create|delete)\(/.test(read(file)),
  );
  assert.deepEqual(writers, ['app/actions/story-actions.ts']);
});

test('updateUserPreferences accepts only boolean newStories and newBlogPosts', () => {
  const src = read('app/actions/story-actions.ts');
  const start = src.indexOf('export async function updateUserPreferences(');
  assert.ok(start >= 0, 'updateUserPreferences exists');
  const body = src.slice(start, src.indexOf('\nexport ', start + 1) === -1 ? undefined : src.indexOf('\nexport ', start + 1));
  assert.match(body, /verifyUser\(token\)/, 'checks the caller first');
  assert.match(body, /key !== 'newStories' && key !== 'newBlogPosts'\) \|\| typeof value !== 'boolean'/);
  assert.match(body, /\.update\(update\)/, 'writes only the validated fields');
});

test('firestore.rules lets clients read their user document but not write it', () => {
  const rules = read('firestore.rules');
  const start = rules.indexOf('match /users/{uid}');
  assert.ok(start >= 0, 'users rule exists');
  let depth = 0;
  let end = rules.indexOf('{', start + 'match /users/{uid}'.length);
  for (let i = end; i < rules.length; i++) {
    if (rules[i] === '{') depth++;
    if (rules[i] === '}' && --depth === 0) { end = i; break; }
  }
  const block = rules.slice(start, end + 1);
  assert.match(block, /allow read: if request\.auth\.uid == uid;/);
  assert.ok(!/allow[^:;]*\b(write|update|create|delete)\b/.test(block), `users/{uid} must not allow client writes:\n${block}`);
});
