// node --test: async results only land in state while they are still current (issue #29 follow-up).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const root = new URL('..', import.meta.url).pathname;
const read = (file) => readFileSync(join(root, file), 'utf8');

// Returns the source of each `useEffect(...)` call, matched by parentheses.
function effects(src) {
  const blocks = [];
  let from = 0;
  for (;;) {
    const start = src.indexOf('useEffect(', from);
    if (start === -1) return blocks;
    let depth = 0;
    let i = start + 'useEffect'.length;
    for (; i < src.length; i++) {
      if (src[i] === '(') depth++;
      else if (src[i] === ')' && --depth === 0) break;
    }
    blocks.push(src.slice(start, i + 1));
    from = i + 1;
  }
}

test('Search applies a search outcome only when it is still the latest search', () => {
  const src = read('components/Search/Search.tsx');
  assert.ok(!/\.then\(\s*applySearchOutcome\s*\)/.test(src), 'search outcomes must not be applied unguarded via .then(applySearchOutcome)');
  const lines = src.split('\n');
  const calls = lines
    .map((line, i) => ({ line, i }))
    .filter(({ line }) => /applySearchOutcome\(/.test(line) && !/const applySearchOutcome/.test(line));
  assert.ok(calls.length >= 2, 'both the typed search and the search started on open should apply outcomes');
  for (const { line, i } of calls) {
    const context = `${lines[i - 1] ?? ''}\n${line}`;
    assert.match(context, /if\s*\([^)]*(\.current|ignore)/, `unguarded search outcome at Search.tsx:${i + 1}: ${line.trim()}`);
  }
});

test('Search counts search requests so an older search cannot overwrite a newer one', () => {
  const src = read('components/Search/Search.tsx');
  const effect = effects(src).find((e) => e.includes('searchNumu('));
  assert.ok(effect, 'the open-modal search runs in an effect');
  assert.match(effect, /\+\+\s*latestSearch\.current/, 'the effect search takes a new request number');
  assert.match(src, /const queryNumu[\s\S]*?\+\+\s*latestSearch\.current/, 'the typed search takes a new request number');
});

test('StoriesShell ignores a metadata fetch once the effect for that user is cleaned up', () => {
  const src = read('components/Stories/StoriesShell.tsx');
  const effect = effects(src).find((e) => e.includes('fetchMetadata('));
  assert.ok(effect, 'metadata loads in an effect');
  assert.match(effect, /let ignore = false/);
  assert.match(effect, /return \(\) => \{\s*ignore = true;?\s*\}/);
});

test('StoriesShell ignores a refreshMetadata result once the user has changed', () => {
  const src = read('components/Stories/StoriesShell.tsx');
  assert.match(src, /const loadMetadata = useCallback\([\s\S]*?activeUser\.current === user[\s\S]*?\[user\]\s*\)/);
});

test('StoriesShell clears admin state and drafts when the user signs out', () => {
  const src = read('components/Stories/StoriesShell.tsx');
  const reset = src.match(/if \(!user\)\s*\{([^}]*)\}/);
  assert.ok(reset, 'StoriesShell handles user becoming null');
  assert.match(reset[1], /setIsAdmin\(false\)/);
  assert.match(reset[1], /setDraftsList\(\[\]\)/);
});

test('NavBar renders the auth-dependent menu only after hydration', () => {
  const src = read('components/Navigation/NavBar.tsx');
  assert.match(src, /const hydrated = useSyncExternalStore\(/);
  assert.match(src, /const userMenu = !hydrated \|\| loading \? null/);
});
