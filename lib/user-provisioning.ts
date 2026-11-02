// First sign-in: create users/{uid} on the server (issue #43). Firestore rules deny client writes to user
// documents, so the ensureUserDoc server action calls this with the Admin SDK. Kept free of imports so the
// checks can be unit-tested without Firebase (test/ensure-user-doc.test.mjs).

/** The fields of a verified Firebase ID token this module reads. */
export interface VerifiedToken {
  uid: string;
  email?: string;
  email_verified?: boolean;
}

/** The only fields a server-created user document may have. `admin` is never one of them. */
export interface NewUserDoc {
  email?: string;
}

export interface ProvisionDeps {
  /** Verifies a Firebase ID token and returns its claims; throws when the token is invalid. */
  verifyIdToken: (token: string) => Promise<VerifiedToken>;
  /** Whether users/{uid} exists. */
  userExists: (uid: string) => Promise<boolean>;
  /** Creates users/{uid}; fails if it already exists (Firestore `create`), so it never overwrites. */
  createUser: (uid: string, data: NewUserDoc) => Promise<void>;
}

export type ProvisionResult =
  | { success: true; created: boolean }
  | { success: false; error: string };

// Firestore's ALREADY_EXISTS (gRPC code 6): another request created the document first.
function isAlreadyExists(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return code === 6 || code === 'already-exists' || code === 'ALREADY_EXISTS';
}

/**
 * Creates the caller's user document if it doesn't exist yet. Everything written comes from the verified
 * token: `email` only when the token says it is verified, and never `admin` (admins are set by hand).
 */
export async function provisionUser(token: unknown, deps: ProvisionDeps): Promise<ProvisionResult> {
  if (typeof token !== 'string' || token.length === 0) {
    return { success: false, error: 'Unauthorized' };
  }

  let decoded: VerifiedToken;
  try {
    decoded = await deps.verifyIdToken(token);
  } catch {
    return { success: false, error: 'Unauthorized' };
  }
  if (!decoded || typeof decoded.uid !== 'string' || decoded.uid.length === 0) {
    return { success: false, error: 'Unauthorized' };
  }

  if (await deps.userExists(decoded.uid)) {
    return { success: true, created: false };
  }

  // Build the document field by field from the token; nothing else reaches it.
  const data: NewUserDoc = {};
  if (decoded.email_verified === true && typeof decoded.email === 'string' && decoded.email.length > 0) {
    data.email = decoded.email;
  }

  try {
    await deps.createUser(decoded.uid, data);
  } catch (error) {
    if (isAlreadyExists(error)) return { success: true, created: false };
    throw error;
  }
  return { success: true, created: true };
}
