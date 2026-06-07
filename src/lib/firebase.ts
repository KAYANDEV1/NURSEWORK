import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import defaultFirebaseConfig from '../../firebase-applet-config.json';

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
  console.error("Error loading Firebase override config in lib/firebase:", e);
}

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);                
export const auth = getAuth();

