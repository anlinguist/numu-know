import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

let app: App;

const init = () => {
  if (app) return app;

  if (!getApps().length) {
    // Default to the project the build's web config names, so a dev or preview build never reaches production.
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'numu-know';

    if (!projectId) {
      throw new Error('FIREBASE_PROJECT_ID environment variable is required');
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
