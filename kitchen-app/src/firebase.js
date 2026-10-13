import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  onSnapshot,
  enableIndexedDbPersistence
} from 'firebase/firestore';

const STORAGE_KEY_FIREBASE = 'kd_firebase_config';

/**
 * Get active Firebase config from either environment variables or localStorage
 */
export function getFirebaseConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_FIREBASE);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.projectId && parsed.apiKey) {
        return parsed;
      }
    }
  } catch {
    // Ignore parse error
  }

  // Fallback to Vite environment variables
  const envConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
  };

  if (envConfig.apiKey && envConfig.projectId) {
    return envConfig;
  }

  return null;
}

export function isFirebaseConfigured() {
  const cfg = getFirebaseConfig();
  return Boolean(cfg && cfg.projectId && cfg.apiKey && !cfg.apiKey.includes('YOUR_'));
}

let appInstance = null;
let dbInstance = null;

/**
 * Initialize or reinitialize Firebase app and Firestore
 */
export function initFirebase(customConfig = null) {
  const config = customConfig || getFirebaseConfig();
  if (!config || !config.projectId || !config.apiKey || config.apiKey.includes('YOUR_')) {
    return { app: null, db: null, status: 'unconfigured' };
  }

  try {
    if (getApps().length > 0) {
      appInstance = getApp();
    } else {
      appInstance = initializeApp(config);
    }
    dbInstance = getFirestore(appInstance);
    return { app: appInstance, db: dbInstance, status: 'connected' };
  } catch (err) {
    console.warn('[Firebase] Initialization error:', err);
    return { app: null, db: null, status: 'error', error: err.message };
  }
}

// Initial setup attempt
const initial = initFirebase();
export const app = initial.app;
export const db = initial.db;

/**
 * Save custom config directly from UI settings modal
 */
export function saveFirebaseConfig(config) {
  if (!config || !config.projectId || !config.apiKey) {
    throw new Error('Project ID and API Key are required.');
  }
  localStorage.setItem(STORAGE_KEY_FIREBASE, JSON.stringify(config));
  const res = initFirebase(config);
  return res;
}

export function clearFirebaseConfig() {
  localStorage.removeItem(STORAGE_KEY_FIREBASE);
  appInstance = null;
  dbInstance = null;
}

/**
 * Test connectivity with Firestore by reading or writing a test probe
 */
export async function testFirestoreConnection(customConfig = null) {
  const config = customConfig || getFirebaseConfig();
  if (!config || !config.projectId) {
    return { success: false, message: 'Firebase configuration is missing or incomplete.' };
  }

  try {
    const testApp = getApps().length > 0 ? getApp() : initializeApp(config);
    const testDb = getFirestore(testApp);
    const probeRef = doc(testDb, '_health', 'probe');
    await setDoc(probeRef, { lastPing: new Date().toISOString() }, { merge: true });
    return { success: true, message: `Successfully connected to Firestore project "${config.projectId}"!` };
  } catch (err) {
    console.error('[Firebase] Test connection failed:', err);
    return { success: false, message: err.message || 'Failed to connect to Firestore.' };
  }
}

/**
 * Sync a document to Firestore collection
 */
export async function syncDocToFirestore(collectionName, docId, data) {
  if (!dbInstance) {
    const current = initFirebase();
    if (!current.db) return false;
  }
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
  if (!dbInstance) {
    const current = initFirebase();
    if (!current.db) return null;
  }
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
  if (!dbInstance) {
    const current = initFirebase();
    if (!current.db) return () => {};
  }
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
