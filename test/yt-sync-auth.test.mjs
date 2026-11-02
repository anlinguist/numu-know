// node --test: the YouTube sync is an admin-only action and pages read videos from Firestore (issue #31).
// The route handler is loaded for real, compiled with the TypeScript devDependency so this runs on Node 20
// (CI, Dockerfile). '@/lib/firebase-admin' is replaced with an in-memory fake and the YouTube Data API with a
// stubbed fetch, so nothing here reaches Firebase or Google.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { register } from 'node:module';
import { join } from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';
import { pathToFileURL } from 'node:url';

const root = new URL('..', import.meta.url).pathname;
const read = (file) => readFileSync(join(root, file), 'utf8');

// Resolve the '@/…' alias and extensionless TypeScript imports, and stub firebase-admin.
const hooks = `
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const root = ${JSON.stringify(pathToFileURL(root).href)};
const ts = createRequire(root)('typescript');
const withTs = (url) => {
  if (/\\.[cm]?[jt]sx?$/.test(url)) return url;
  for (const ext of ['.ts', '.tsx', '/index.ts']) if (existsSync(fileURLToPath(url + ext))) return url + ext;
  return url;
};
export async function resolve(specifier, context, next) {
  if (specifier === '@/lib/firebase-admin') return { url: 'stub:firebase-admin', shortCircuit: true };
  if (specifier === 'next/server') return next('next/server.js', context);
  if (specifier.startsWith('@/')) return { url: withTs(new URL(specifier.slice(2), root).href), shortCircuit: true };
  if (specifier.startsWith('.') && context.parentURL?.endsWith('.ts')) {
    return { url: withTs(new URL(specifier, context.parentURL).href), shortCircuit: true };
  }
  return next(specifier, context);
}
export async function load(url, context, next) {
  if (url === 'stub:firebase-admin') {
    return {
      format: 'module',
      shortCircuit: true,
      source: 'export const getDb = () => globalThis.__fakeAdmin.db; export const getAdminAuth = () => globalThis.__fakeAdmin.auth;',
    };
  }
  if (url.startsWith(root) && url.endsWith('.ts')) {
    // Node 20 (CI, Dockerfile) can't load .ts, so compile it with the repo's own TypeScript devDependency.
    const { outputText } = ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), {
      fileName: fileURLToPath(url),
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, verbatimModuleSyntax: false },
    });
    return { format: 'module', shortCircuit: true, source: outputText };
  }
  return next(url, context);
}
`;
register(`data:text/javascript,${encodeURIComponent(hooks)}`);

const { NextRequest } = await import('next/server');

const USERS = { admin: { admin: true }, member: { admin: false } };
const TOKENS = { 'admin-token': 'admin', 'member-token': 'member', 'unknown-user-token': 'ghost' };

let writes;
let fetches;
let realFetch;

beforeEach(() => {
  writes = [];
  fetches = [];
  globalThis.__fakeAdmin = {
    auth: {
      verifyIdToken: async (token) => {
        if (!(token in TOKENS)) throw new Error('invalid token');
        return { uid: TOKENS[token] };
      },
    },
    db: {
      collection: (name) => ({
        doc: (id) => ({
          get: async () => {
            const data = name === 'users' ? USERS[id] : undefined;
            return { exists: data !== undefined, data: () => data };
          },
          set: async (data) => {
            writes.push({ path: `${name}/${id}`, data });
          },
        }),
      }),
    },
  };
  realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    fetches.push(String(url));
    const body = String(url).includes('/search?')
      ? { items: [{ id: { videoId: 'vid1' } }, { id: { playlistId: 'pl1' } }] }
      : { items: [{ snippet: { title: 'T', description: 'D', publishedAt: '2024-01-01T00:00:00Z', thumbnails: { high: { url: 'https://i.ytimg.com/x.jpg' } } } }] };
    return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
  };
  process.env.YOUTUBE_API_KEY = 'test-key';
});

afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.YOUTUBE_API_KEY;
});

const route = await import(pathToFileURL(join(root, 'app/api/getYTVideos/route.ts')).href);

let ip = 0;
const request = (method, headers = {}) =>
  new NextRequest('http://localhost/api/getYTVideos', {
    method,
    // A distinct client per request so the rate limiter never interferes.
    headers: { 'x-forwarded-for': `10.0.0.${++ip}`, ...headers },
  });

test('the sync route has no GET handler (Next answers 405)', () => {
  assert.equal(route.GET, undefined);
  assert.equal(typeof route.POST, 'function');
});

test('an unauthenticated POST cannot trigger a sync', async () => {
  const res = await route.POST(request('POST'));
  assert.equal(res.status, 401);
  assert.deepEqual(fetches, [], 'YouTube is not called');
  assert.deepEqual(writes, [], 'ytvids is not written');
});

test('a POST with an invalid token cannot trigger a sync', async () => {
  const res = await route.POST(request('POST', { authorization: 'Bearer forged' }));
  assert.equal(res.status, 401);
  assert.deepEqual(fetches, []);
  assert.deepEqual(writes, []);
});

test('a signed-in non-admin cannot trigger a sync', async () => {
  for (const token of ['member-token', 'unknown-user-token']) {
    const res = await route.POST(request('POST', { authorization: `Bearer ${token}` }));
    assert.equal(res.status, 403, token);
  }
  assert.deepEqual(fetches, []);
  assert.deepEqual(writes, []);
});

test('an admin POST syncs videos into ytvids', async () => {
  const res = await route.POST(request('POST', { authorization: 'Bearer admin-token' }));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { success: true });
  assert.deepEqual(writes, [
    {
      path: 'ytvids/vid1',
      data: { title: 'T', description: 'D', image: 'https://i.ytimg.com/x.jpg', publish_date: '2024-01-01T00:00:00Z' },
    },
  ]);
});

function sources(dir) {
  return readdirSync(join(root, dir)).flatMap((name) => {
    const rel = join(dir, name);
    if (statSync(join(root, rel)).isDirectory()) return sources(rel);
    return /\.(ts|tsx|js|jsx|mjs)$/.test(name) ? [rel] : [];
  });
}

test('pages and components never trigger the sync; Learn reads ytvids from Firestore', () => {
  for (const file of [...sources('app'), ...sources('components')]) {
    assert.ok(!read(file).includes('/api/getYTVideos'), `${file} must not call the sync endpoint`);
  }
  assert.match(read('components/Learn/Learn.tsx'), /getDocs\(collection\(fbfsdb, `ytvids`\)\)/);
});

test('API clients call the sync with an authenticated POST', () => {
  const client = read('lib/api-client.ts');
  const call = client.slice(client.indexOf("apiFetch('/api/getYTVideos'"));
  assert.match(call, /^apiFetch\('\/api\/getYTVideos', \{\s*method: 'POST',\s*requiresAuth: true,/);
  const api = read('lib/api.ts');
  const fn = api.slice(api.indexOf('getYTVideos:'));
  assert.match(fn, /method: 'POST'/);
  assert.match(fn, /Authorization: `Bearer \$\{token\}`/);
});
