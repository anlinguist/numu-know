// Which sign-in methods the login modal offers (issue #43). No imports, so it can be unit-tested directly.

/**
 * Email and password sign-in is for the dev Firebase project only (previews, CI and agent runs sign in as the
 * seeded test users). Production offers Google only.
 */
export function emailPasswordSignInEnabled(projectId: string | undefined): boolean {
  return typeof projectId === 'string' && projectId.endsWith('-dev');
}
