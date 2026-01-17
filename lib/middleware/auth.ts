import { NextRequest, NextResponse } from 'next/server';
import { getDb, getAdminAuth } from '@/lib/firebase-admin';

/**
 * Middleware to verify user authentication and admin status
 * @param request - The incoming request
 * @returns Object containing authentication status and user data
 */
export async function verifyAuth(request: NextRequest): Promise<{
  authenticated: boolean;
  isAdmin: boolean;
  uid: string | null;
  error?: string;
}> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      authenticated: false,
      isAdmin: false,
      uid: null,
      error: 'No authorization token provided'
    };
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(token);
    const uid = decodedToken.uid;

    const db = getDb();
    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      return {
        authenticated: true,
        isAdmin: false,
        uid,
        error: 'User not found'
      };
    }

    const userData = userDoc.data();
    const isAdmin = userData?.['admin'] === true;

    return {
      authenticated: true,
      isAdmin,
      uid
    };
  } catch (error) {
    return {
      authenticated: false,
      isAdmin: false,
      uid: null,
      error: 'Authentication failed'
    };
  }
}

/**
 * Middleware to require admin access
 * Returns error response if user is not admin, null if authorized
 */
export async function requireAdmin(request: NextRequest): Promise<NextResponse | null> {
  const auth = await verifyAuth(request);

  if (!auth.authenticated) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  if (!auth.isAdmin) {
    return NextResponse.json(
      { success: false, error: 'Forbidden - Admin access required' },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Middleware to require authentication (but not necessarily admin)
 * Returns error response if user is not authenticated, null if authorized
 */
export async function requireAuth(request: NextRequest): Promise<NextResponse | null> {
  const auth = await verifyAuth(request);

  if (!auth.authenticated) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return null;
}
