import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDGzuGONU0IL7LPlkNhtHuoNKK0_5IKAfk",
  authDomain: "hdelectricdz.firebaseapp.com",
  projectId: "hdelectricdz",
  storageBucket: "hdelectricdz.firebasestorage.app",
  messagingSenderId: "55148690186",
  appId: "1:55148690186:web:4baa88c854ec92bcef18f3",
  measurementId: "G-56NPQ8VHN0",
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const firestore = getFirestore(firebaseApp);
export const firebaseAuth = getAuth(firebaseApp);

export async function bootFirebaseAnalytics() {
  if (typeof window === "undefined") return null;

  try {
    const analytics = await import("firebase/analytics");
    const supported = await analytics.isSupported();
    return supported ? analytics.getAnalytics(firebaseApp) : null;
  } catch {
    return null;
  }
}
