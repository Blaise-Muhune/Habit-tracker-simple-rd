import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getAnalytics } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: "AIzaSyCfJtVXjJ4PoWKiidrl1gG6EcUhADArD-U",
  authDomain: "simple-r-ef519.firebaseapp.com",
  projectId: "simple-r-ef519",
  storageBucket: "simple-r-ef519.firebasestorage.app",
  messagingSenderId: "614246022655",
  appId: "1:614246022655:web:cd26bfa09bb74737b3fbca",
  measurementId: "G-M8GQGC3GJ1"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize services
export const db = getFirestore(app)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()

// Only initialize analytics on the client side
if (typeof window !== 'undefined') {
  const analytics = getAnalytics(app)
} 