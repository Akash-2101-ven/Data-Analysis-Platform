import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDASTISymPYDn4R74wcinX9_SMjIZXzmek",
  authDomain: "data-analytics-platform-e0ff1.firebaseapp.com",
  projectId: "data-analytics-platform-e0ff1",
  storageBucket: "data-analytics-platform-e0ff1.firebasestorage.app",
  messagingSenderId: "578099825654",
  appId: "1:578099825654:web:3e060287f71cf04955d5d7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Authentication
export const auth = getAuth(app);

// Google Provider
export const googleProvider = new GoogleAuthProvider();

export default app;