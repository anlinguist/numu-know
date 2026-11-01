import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

let app: App;

const init = () => {
  if (app) return app;

  if (!getApps().length) {
    // The project the build's web config names (or FIREBASE_PROJECT_ID). No default: a dev, test or preview
    // process without one fails instead of reaching production through someone's credentials.
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (!projectId) {
      throw new Error('FIREBASE_PROJECT_ID or NEXT_PUBLIC_FIREBASE_PROJECT_ID is required');
    }

    // Initialize with ADC - no service account JSON needed
    app = initializeApp({
      projectId,
    });
  } else {
    app = getApps()[0];
  }
  return app;
}

export const getDb = () => getFirestore(init());
export const getAdminAuth = () => getAuth(init());
export const getAdminStorage = () => getStorage(init());
