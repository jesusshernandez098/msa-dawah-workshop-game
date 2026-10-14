import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously as firebaseSignInAnonymously,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  getDatabase,
  ref,
  set,
  get,
  update,
  remove,
  onValue,
  runTransaction,
  serverTimestamp,
  onDisconnect,
  type DatabaseReference,
} from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyCjAR2gK_UmWqh400s_3swCga9TO1c7ACw",
  authDomain: "msa-dawah-workshop-game.firebaseapp.com",
  databaseURL: "https://msa-dawah-workshop-game-default-rtdb.firebaseio.com",
  projectId: "msa-dawah-workshop-game",
  storageBucket: "msa-dawah-workshop-game.firebasestorage.app",
  messagingSenderId: "447432493955",
  appId: "1:447432493955:web:a09e0b88f6206bdcb504b6"
};

// Client-side initialization only
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const rtdb = getDatabase(app);

// Helper for ensuring anonymous authentication
export async function ensureAnonymousAuth(): Promise<User> {
  if (auth.currentUser) {
    return auth.currentUser;
  }
  const credential = await firebaseSignInAnonymously(auth);
  return credential.user;
}

export {
  ref,
  set,
  get,
  update,
  remove,
  onValue,
  runTransaction,
  serverTimestamp,
  onDisconnect,
  onAuthStateChanged,
};
export type { DatabaseReference, User };
