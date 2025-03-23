import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const apps = getApps();

if (!apps.length) {
  // Get environment variables from OS
  const {
    FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_FIREBASE_CLIENT_EMAIL,
    NEXT_FIREBASE_PRIVATE_KEY,
  } = process.env;

  if (!FIREBASE_PROJECT_ID || !NEXT_FIREBASE_CLIENT_EMAIL || !NEXT_FIREBASE_PRIVATE_KEY) {
    const missingVars = [
      !FIREBASE_PROJECT_ID && 'FIREBASE_PROJECT_ID',
      !NEXT_FIREBASE_CLIENT_EMAIL && 'NEXT_FIREBASE_CLIENT_EMAIL',
      !NEXT_FIREBASE_PRIVATE_KEY && 'NEXT_FIREBASE_PRIVATE_KEY',
    ].filter(Boolean);

    console.error('❌ Missing Firebase Admin configuration:', missingVars.join(', '));
    throw new Error(`Missing Firebase Admin configuration: ${missingVars.join(', ')}`);
  }

  try {
    initializeApp({
      credential: cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: NEXT_FIREBASE_CLIENT_EMAIL,
        privateKey: NEXT_FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error);
    throw error;
  }
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();