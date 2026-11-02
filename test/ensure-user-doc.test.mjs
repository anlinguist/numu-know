// node --test: sign-in and first-sign-in user documents (issue #43).
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

const { provisionUser } = await loadTs('lib/user-provisioning.ts');
const { emailPasswordSignInEnabled } = await loadTs('lib/auth-options.ts');

// In-memory stand-ins for the Admin SDK: tokens map to claims, docs is the users collection.
function fakeDeps({ tokens = {}, docs = {} } = {}) {
  const calls = { verify: [], create: [] };
  return {
    calls,
    docs,
    deps: {
      verifyIdToken: async (token) => {
        calls.verify.push(token);
        if (!(token in tokens)) throw new Error('auth/argument-error');
        return tokens[token];
      },
      userExists: async (uid) => uid in docs,
      createUser: async (uid, data) => {
        calls.create.push([uid, data]);
        if (uid in docs) throw Object.assign(new Error('ALREADY_EXISTS'), { code: 6 });
        docs[uid] = data;
      },
    },
  };
}

test('a token is required', async () => {
  for (const token of [undefined, null, '', 42, {}, ['t']]) {
    const f = fakeDeps();
    assert.deepEqual(await provisionUser(token, f.deps), { success: false, error: 'Unauthorized' });
    assert.equal(f.calls.verify.length, 0, `no verification attempt for ${JSON.stringify(token)}`);
    assert.equal(f.calls.create.length, 0);
  }
});

test('an invalid token writes nothing', async () => {
  const f = fakeDeps();
  assert.deepEqual(await provisionUser('forged', f.deps), { success: false, error: 'Unauthorized' });
  assert.deepEqual(f.calls.verify, ['forged']);
  assert.equal(f.calls.create.length, 0);
});

test('a first-time user gets a document with the email from the verified token', async () => {
  const f = fakeDeps({ tokens: { t: { uid: 'u1', email: 'new@example.com', email_verified: true } } });
  assert.deepEqual(await provisionUser('t', f.deps), { success: true, created: true });
  assert.deepEqual(f.docs.u1, { email: 'new@example.com' });
});

test('email comes only from the token, never from the caller', async () => {
  const f = fakeDeps({ tokens: { t: { uid: 'u1', email: 'real@example.com', email_verified: true } } });
  // Extra arguments a client could pass to the server action are ignored.
  await provisionUser('t', f.deps, { email: 'spoof@example.com', admin: true });
  assert.deepEqual(f.docs.u1, { email: 'real@example.com' });
});

test('an unverified email is not stored', async () => {
  const f = fakeDeps({ tokens: { t: { uid: 'u1', email: 'someone@example.com', email_verified: false } } });
  assert.deepEqual(await provisionUser('t', f.deps), { success: true, created: true });
  assert.deepEqual(f.docs.u1, {});
});

test('admin can never be set', async () => {
  // Even a token carrying an admin custom claim, or a client passing admin, doesn't produce an admin field.
  const f = fakeDeps({ tokens: { t: { uid: 'u1', email: 'a@example.com', email_verified: true, admin: true } } });
  await provisionUser('t', f.deps, { admin: true });
  assert.ok(!('admin' in f.docs.u1), 'no admin field');
  assert.deepEqual(Object.keys(f.docs.u1), ['email']);
});

test('an existing user document is left alone', async () => {
  const f = fakeDeps({
    tokens: { t: { uid: 'u1', email: 'a@example.com', email_verified: true } },
    docs: { u1: { admin: true, email: 'a@example.com', newStories: true } },
  });
  assert.deepEqual(await provisionUser('t', f.deps), { success: true, created: false });
  assert.equal(f.calls.create.length, 0);
  assert.deepEqual(f.docs.u1, { admin: true, email: 'a@example.com', newStories: true });
});

test('losing a creation race to another request still succeeds without overwriting', async () => {
  const f = fakeDeps({ tokens: { t: { uid: 'u1', email: 'a@example.com', email_verified: true } } });
  f.deps.userExists = async () => false; // the other request creates the doc between the check and the write
  f.docs.u1 = { admin: true };
  assert.deepEqual(await provisionUser('t', f.deps), { success: true, created: false });
  assert.deepEqual(f.docs.u1, { admin: true });
});

test('ensureUserDoc is a server action that takes only a token and creates via the Admin SDK', () => {
  const src = read('app/actions/story-actions.ts');
  assert.match(src, /^'use server';/);
  const start = src.indexOf('export async function ensureUserDoc(');
  assert.ok(start >= 0, 'ensureUserDoc exists');
  const next = src.indexOf('\nexport ', start + 1);
  const body = src.slice(start, next === -1 ? undefined : next);
  assert.match(body, /^export async function ensureUserDoc\(token: string\)/, 'the only argument is the token');
  assert.match(body, /provisionUser\(token,/);
  assert.match(body, /getAdminAuth\(\)\.verifyIdToken\(/);
  assert.match(body, /\.create\(data\)/, 'creates, never set/merge, so an existing document is not overwritten');
  assert.ok(!/admin/i.test(body.replace(/getAdminAuth/g, '')), 'the action never mentions admin');
});

test('email and password sign-in is offered only on the dev project', () => {
  assert.equal(emailPasswordSignInEnabled('numu-know-dev'), true);
  assert.equal(emailPasswordSignInEnabled('numu-know'), false);
  assert.equal(emailPasswordSignInEnabled('numu-know-dev-x'), false);
  assert.equal(emailPasswordSignInEnabled(''), false);
  assert.equal(emailPasswordSignInEnabled(undefined), false);
});

test('the login modal is rendered and uses Google sign-in with a redirect fallback', () => {
  const layout = read('components/ClientLayout.tsx');
  assert.match(layout, /<LoginModal\b[^>]*opened=\{loginModalOpen\}/, 'ClientLayout renders the login modal');
  const modal = read('components/Auth/LoginModal.tsx');
  assert.match(modal, /signInWithPopup\(auth, googleProvider\)/);
  assert.match(modal, /signInWithRedirect\(auth, googleProvider\)/);
  assert.match(modal, /getRedirectResult\(auth\)/);
  assert.match(modal, /emailPasswordSignInEnabled\(process\.env\.NEXT_PUBLIC_FIREBASE_PROJECT_ID\)/);
  assert.match(modal, /ensureUserDoc\(/, 'first sign-in creates the user document on the server');
});
