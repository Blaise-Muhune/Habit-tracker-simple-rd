import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

if (!process.env.FIREBASE_ADMIN_PRIVATE_KEY || 
    !process.env.FIREBASE_ADMIN_CLIENT_EMAIL || 
    !process.env.FIREBASE_ADMIN_PROJECT_ID) {
  throw new Error('Firebase Admin environment variables are missing');
}

const firebaseAdminConfig = {
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
};

const apps = getApps();
const firebaseAdmin = apps.length === 0 ? initializeApp(firebaseAdminConfig) : apps[0];
export const adminAuth = getAuth(firebaseAdmin); 