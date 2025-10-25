import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// These variables are loaded from the .env file
const firebaseConfig = {
  apiKey: "AIzaSyALm0b26H7sZsdnBeNm6Qr3aLrQxQi-Ou0",
  authDomain: "arpit-c291c.firebaseapp.com",
  projectId: "arpit-c291c",
  storageBucket: "arpit-c291c.firebasestorage.app",
  messagingSenderId: "598857830181",
  appId: "1:598857830181:web:dba3e919b06b66232fd4cc"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the services you need
export const auth = getAuth(app);
export const db = getFirestore(app);
