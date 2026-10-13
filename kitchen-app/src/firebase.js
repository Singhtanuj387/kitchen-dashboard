import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot
} from 'firebase/firestore';

/**
 * Pure Environment-Variable Driven Firebase Firestore Configuration.
 * Configured strictly via .env, .env.local, or Vercel Environment Variables:
 *   - VITE_FIREBASE_API_KEY
 *   - VITE_FIREBASE_AUTH_DOMAIN
 *   - VITE_FIREBASE_PROJECT_ID
 *   - VITE_FIREBASE_STORAGE_BUCKET
 *   - VITE_FIREBASE_MESSAGING_SENDER_ID
 *   - VITE_FIREBASE_APP_ID
 */
const envConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export function isFirebaseConfigured() {
  return Boolean(
    envConfig.apiKey &&
    envConfig.projectId &&
    !envConfig.apiKey.includes('YOUR_') &&
    !envConfig.projectId.includes('YOUR_')
  );
}

let appInstance = null;
let dbInstance = null;

if (isFirebaseConfigured()) {
  try {
    appInstance = getApps().length > 0 ? getApp() : initializeApp(envConfig);
    dbInstance = getFirestore(appInstance);
  } catch (err) {
    console.warn('[Firebase] Firestore initialization error from environment:', err);
  }
}

export const app = appInstance;
export const db = dbInstance;

/**
 * Sync a document to Firestore collection
 */
export async function syncDocToFirestore(collectionName, docId, data) {
  if (!dbInstance) return false;
  try {
    const docRef = doc(dbInstance, collectionName, docId);
    await setDoc(docRef, { data, updatedAt: new Date().toISOString() }, { merge: true });
    return true;
  } catch (err) {
    console.warn(`[Firestore] Failed to sync ${collectionName}/${docId}:`, err);
    return false;
  }
}

/**
 * Fetch a document from Firestore
 */
export async function fetchDocFromFirestore(collectionName, docId) {
  if (!dbInstance) return null;
  try {
    const docRef = doc(dbInstance, collectionName, docId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data()?.data || null;
    }
    return null;
  } catch (err) {
    console.warn(`[Firestore] Failed to fetch ${collectionName}/${docId}:`, err);
    return null;
  }
}

/**
 * Listen to real-time updates for a single document
 */
export function listenDocFirestore(collectionName, docId, callback) {
  if (!dbInstance) return () => {};
  try {
    const docRef = doc(dbInstance, collectionName, docId);
    return onSnapshot(docRef, snap => {
      if (snap.exists()) {
        callback(snap.data()?.data);
      }
    }, err => {
      console.warn(`[Firestore] Listener error on ${collectionName}/${docId}:`, err);
    });
  } catch {
    return () => {};
  }
}

export default app;
