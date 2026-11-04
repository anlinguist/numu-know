// node --test: numu-know.com (apex) redirects to www.numu-know.com so there is one canonical host (issue #50).
// proxy.ts is loaded for real, compiled with the TypeScript devDependency so this runs on Node 20 (CI, Dockerfile).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = new URL('..', import.meta.url).pathname;
const require = createRequire(join(root, 'package.json'));
const nextServerUrl = pathToFileURL(require.resolve('next/server')).href;

// proxy.ts imports only 'next/server'; point that import at the installed file so the data: module can load it.
const { outputText } = ts.transpileModule(readFileSync(join(root, 'proxy.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const source = outputText.replace(/from ['"]next\/server['"]/g, `from ${JSON.stringify(nextServerUrl)}`);
const { proxy, config } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

const { NextRequest } = require('next/server');
const { unstable_doesMiddlewareMatch } = require('next/experimental/testing/server');

// Cloud Run serves on its own port and passes the original Host header through; the URL's host is not trusted.
const requestFor = (host, path) =>
  new NextRequest(`http://localhost:8080${path}`, { headers: { host } });

const matches = (host, path, headers = {}) =>
  unstable_doesMiddlewareMatch({ config, url: `https://${host}${path}`, headers: { host, ...headers } });

test('the apex host gets a 308 to www with the same path and query', () => {
  for (const path of ['/', '/dictionary?q=t%C3%BCba&page=2', '/stories/Some%20Story', '/api/search?term=a&b=1']) {
    const res = proxy(requestFor('numu-know.com', path));
    assert.equal(res.status, 308, path);
    assert.equal(res.headers.get('location'), `https://www.numu-know.com${path}`, path);
  }
});

test('the apex host is matched case-insensitively and with a port', () => {
  for (const host of ['NUMU-KNOW.COM', 'numu-know.com:443', 'numu-know.com.']) {
    const res = proxy(requestFor(host, '/learn?x=1'));
    assert.equal(res.status, 308, host);
    assert.equal(res.headers.get('location'), 'https://www.numu-know.com/learn?x=1', host);
  }
});

test('the redirect target host is fixed, never taken from the request', () => {
  const res = proxy(requestFor('numu-know.com', '//evil.example/%2F..?next=https://evil.example'));
  assert.equal(res.status, 308);
  assert.equal(new URL(res.headers.get('location')).host, 'www.numu-know.com');
  assert.ok(res.headers.get('location').startsWith('https://www.numu-know.com/'));
});

test('the redirect runs before the CSP and security headers', () => {
  const res = proxy(requestFor('numu-know.com', '/'));
  assert.equal(res.headers.get('content-security-policy'), null);
  assert.equal(res.headers.get('x-nonce'), null);
});

test('every other host passes through with the CSP', () => {
  for (const host of [
    'www.numu-know.com',
    'numu-know-web-abc123-uc.a.run.app',
    'numu-know-web-pr-50.globalhost.ai',
    'localhost:3000',
    'evil-numu-know.com',
    'numu-know.com.evil.example',
  ]) {
    const res = proxy(requestFor(host, '/dictionary?q=a'));
    assert.equal(res.headers.get('location'), null, host);
    assert.notEqual(res.status, 308, host);
    assert.ok(res.headers.get('content-security-policy'), host);
  }
});

test('API routes on other hosts pass through untouched (no CSP added, as before)', () => {
  const res = proxy(requestFor('www.numu-know.com', '/api/search?term=a'));
  assert.equal(res.headers.get('location'), null);
  assert.equal(res.headers.get('content-security-policy'), null);
});

test('the matcher runs the proxy for API routes and prefetches on the apex host', () => {
  assert.ok(matches('numu-know.com', '/api/search?term=a'));
  assert.ok(matches('numu-know.com', '/api/newStory'));
  assert.ok(matches('numu-know.com', '/dictionary'));
  assert.ok(matches('numu-know.com', '/learn', { 'next-router-prefetch': '1' }));
});

test('the matcher still skips API routes and static files on other hosts', () => {
  assert.ok(matches('www.numu-know.com', '/dictionary'));
  assert.ok(!matches('www.numu-know.com', '/api/search'));
  assert.ok(!matches('www.numu-know.com', '/_next/static/chunk.js'));
  assert.ok(!matches('localhost', '/api/search'));
  assert.ok(!matches('www.numu-know.com', '/learn', { 'next-router-prefetch': '1' }));
});
