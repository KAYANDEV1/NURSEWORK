import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import defaultFirebaseConfig from "../firebase-applet-config.json";

let firebaseConfig = defaultFirebaseConfig;
try {
  const storedOverride = localStorage.getItem("baheya_firebase_config_override");
  if (storedOverride) {
    const parsed = JSON.parse(storedOverride);
    if (parsed && parsed.projectId) {
      firebaseConfig = { ...defaultFirebaseConfig, ...parsed };
    }
  }
} catch (e) {
  console.error("Error loading Firebase override config:", e);
}

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
// Initialize Firestore using the configured database ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

