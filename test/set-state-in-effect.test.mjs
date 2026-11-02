// node --test: react-hooks/set-state-in-effect applies everywhere, with no exceptions (issue #29).
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { ESLint } from 'eslint';

const root = new URL('..', import.meta.url).pathname;
const RULE = 'react-hooks/set-state-in-effect';

const formerExceptions = [
  'components/Navigation/NavBar.tsx',
  'components/NonceContext.tsx',
  'components/Search/Search.tsx',
  'components/Stories/StoriesShell.tsx',
];

function sources(dir) {
  return readdirSync(join(root, dir)).flatMap((name) => {
    const rel = join(dir, name);
    if (statSync(join(root, rel)).isDirectory()) return sources(rel);
    return /\.(ts|tsx|js|jsx|mjs)$/.test(name) ? [rel] : [];
  });
}

test(`no source file or config disables ${RULE}`, () => {
  for (const file of [...sources('components'), ...sources('app'), ...sources('lib'), 'eslint.config.mjs']) {
    const src = readFileSync(join(root, file), 'utf8');
    assert.ok(!src.includes(RULE), `${file} mentions ${RULE}; the rule must apply without exceptions`);
  }
});

test(`the former exceptions pass ${RULE} with inline config ignored`, async () => {
  const eslint = new ESLint({ cwd: root, allowInlineConfig: false });
  const results = await eslint.lintFiles(formerExceptions.map((f) => join(root, f)));
  const violations = results.flatMap((r) =>
    r.messages
      .filter((m) => m.ruleId === RULE)
      .map((m) => `${r.filePath.replace(root, '')}:${m.line} ${m.message}`)
  );
  assert.deepEqual(violations, []);
});
