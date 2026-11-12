import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

function getFirebaseConfig() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId) {
    throw new Error("Faltan variables NEXT_PUBLIC_FIREBASE_* en .env.local.");
  }

  return config;
}

export function getFirebaseApp() {
  return getApps().length ? getApp() : initializeApp(getFirebaseConfig());
}

export function getClientAuth() {
  const auth = getAuth(getFirebaseApp());
  // Los emails que manda Firebase (verificacion, recuperar contraseña) salen en español.
  auth.languageCode = "es";
  return auth;
}

export function getGoogleProvider() {
  return new GoogleAuthProvider();
}
