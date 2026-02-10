/**
 * Firebase Client SDK Initialization
 *
 * Initializes the Firebase app and exports Functions, Firestore, and Auth instances.
 * Enables offline persistence for improved performance and reduced reads.
 */

import { initializeApp, getApps, getApp } from "firebase/app"
import { getFunctions, connectFunctionsEmulator } from "firebase/functions"
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  connectFirestoreEmulator,
  type Firestore,
} from "firebase/firestore"
import { getAuth, connectAuthEmulator } from "firebase/auth"

// Firebase configuration
// These are public keys - safe to expose in client code
const firebaseConfig = {
  apiKey: "AIzaSyC55lowlixG6V8KI-bWV4T-x6MiuNp38-g",
  projectId: "insurance-news-ai",
  authDomain: "insurance-news-ai.firebaseapp.com",
  storageBucket: "insurance-news-ai.firebasestorage.app",
  messagingSenderId: "695640024145",
  appId: "1:695640024145:web:ab17c496e14b3d915ac470",
}

// Initialize Firebase (singleton pattern)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

// Get Functions instance
const functions = getFunctions(app, "us-central1")

// Initialize Firestore with offline persistence
// Uses IndexedDB for caching and supports multiple tabs
let db: Firestore
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  })
} catch {
  // Firestore may already be initialized (hot reload), use existing instance
  const { getFirestore } = await import("firebase/firestore")
  db = getFirestore(app)
}

// Get Auth instance
const auth = getAuth(app)

// Connect to emulators in development
if (import.meta.env.DEV && import.meta.env.VITE_FIREBASE_USE_EMULATOR === "true") {
  connectFunctionsEmulator(functions, "localhost", 5001)
  connectFirestoreEmulator(db, "localhost", 8080)
  connectAuthEmulator(auth, "http://localhost:9099")
}

export { app, functions, db, auth }

