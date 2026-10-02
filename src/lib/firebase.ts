import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

// Safely read Vite environment variables or Node fallback
const globalProcess = typeof globalThis !== 'undefined' ? (globalThis as Record<string, any>).process : undefined;
const env: Record<string, string | undefined> =
  typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env as unknown as Record<string, string | undefined>)
    : (globalProcess?.env as Record<string, string | undefined>) || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: env.VITE_FIREBASE_APP_ID || '',
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.apiKey !== 'your-api-key-here' &&
  !firebaseConfig.apiKey.includes('your-')
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
      import('firebase/analytics').then(({ getAnalytics, isSupported }) => {
        isSupported().then(supported => {
          if (supported && app) getAnalytics(app);
        }).catch(() => {});
      }).catch(() => {});
    }
    console.info('[Firebase] Connected successfully to project:', firebaseConfig.projectId);
  } catch (error) {
    console.warn('[Firebase] Initialization error, falling back to local persistence mode:', error);
  }
} else {
  console.info(
    '[Firebase] Configuration missing or incomplete in .env. Portal is running with local resilient storage.'
  );
}

export { app, auth, db, storage };
