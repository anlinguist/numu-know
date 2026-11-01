// `npm run seed:dev`: write the fixtures in seed/fixtures.mjs to the dev Firebase project (globalhost P1-10).
// Idempotent: fixed document ids, set() rather than add(), and test users matched by email.
// Refuses any project id that doesn't end in "-dev", and reads nothing from Firestore: every document it writes
// comes from the fixtures file (seed/seed.test.mjs checks both).
//
// Auth: Application Default Credentials (`gcloud auth application-default login`) for an account with access to
// the dev project. Env: SEED_PROJECT (default numu-know-dev); optional SEED_ADMIN_PASSWORD / SEED_READER_PASSWORD
// to set test users' passwords (users are created without one otherwise). --dry-run prints the plan only;
// --skip-users seeds Firestore only (Firebase Auth must be enabled in the project before users can be created).
import { STORIES, TEST_USERS, YT_VIDEOS } from './fixtures.mjs';

export const DEV_PROJECT = /^[a-z][a-z0-9-]*-dev$/;

export function assertDevProject(projectId) {
  if (!DEV_PROJECT.test(projectId ?? '')) {
    throw new Error(`refusing to seed "${projectId}": the project id must end in "-dev"`);
  }
}

/** Every Firestore write the seed makes, as [path, data, options]. Pure, so the test can check it. */
export function plan() {
  const writes = [];
  for (const s of STORIES.live) writes.push([`documents/${s.title}`, { item: { data: s.data, author: 'Fixture', defaultVar: 'word' } }]);
  for (const s of STORIES.drafts) writes.push([`drafts/${s.title}`, { data: s.data, author: 'Fixture', defaultVar: 'word' }]);
  // Merge so stories created in dev by hand stay listed.
  writes.push(['allDocuments/live', { documents: STORIES.live.map((s) => s.title) }, { mergeArray: 'documents' }]);
  writes.push(['allDocuments/drafts', { documents: STORIES.drafts.map((s) => s.title) }, { mergeArray: 'documents' }]);
  for (const { id, ...v } of YT_VIDEOS) writes.push([`ytvids/${id}`, v]);
  return writes;
}

async function main() {
  const projectId = process.env.SEED_PROJECT || 'numu-know-dev';
  assertDevProject(projectId);
  const dryRun = process.argv.includes('--dry-run');
  const skipUsers = process.argv.includes('--skip-users');
  const writes = plan();
  console.log(`${dryRun ? 'Would write' : 'Writing'} ${writes.length} documents and ${TEST_USERS.length} test users to ${projectId}`);
  if (dryRun) {
    for (const [path] of writes) console.log(`  ${path}`);
    for (const u of TEST_USERS) console.log(`  auth: ${u.email}${u.admin ? ' (admin)' : ''}`);
    return;
  }

  const { initializeApp } = await import('firebase-admin/app');
  const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
  const { getAuth } = await import('firebase-admin/auth');
  const app = initializeApp({ projectId }, 'seed');
  const db = getFirestore(app);
  const auth = getAuth(app);

  for (const [path, data, opts] of writes) {
    if (opts?.mergeArray) {
      await db.doc(path).set({ [opts.mergeArray]: FieldValue.arrayUnion(...data[opts.mergeArray]) }, { merge: true });
    } else {
      await db.doc(path).set(data);
    }
  }

  for (const u of skipUsers ? [] : TEST_USERS) {
    const password = process.env[u.passwordEnv];
    let user;
    try {
      user = await auth.getUserByEmail(u.email);
      if (password) await auth.updateUser(user.uid, { password });
    } catch (e) {
      if (e?.code !== 'auth/user-not-found') throw e;
      user = await auth.createUser({ email: u.email, displayName: u.displayName, emailVerified: true, ...(password ? { password } : {}) });
    }
    await db.doc(`users/${user.uid}`).set({ admin: u.admin, email: u.email }, { merge: true });
    console.log(`  auth: ${u.email}${u.admin ? ' (admin)' : ''}${password ? '' : ' (no password set)'}`);
  }
  console.log('Done.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
