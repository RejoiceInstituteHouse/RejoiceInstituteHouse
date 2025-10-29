// firebase-config.js 
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDLhqFt4rYXJgxbu5l4q50rx1FZkARyDYE",
  authDomain: "rejoice-institute-house.firebaseapp.com",
  projectId: "rejoice-institute-house",
  storageBucket: "rejoice-institute-house.firebasestorage.app",
  messagingSenderId: "154515308139",
  appId: "1:154515308139:web:72b2e940af48283c787b2e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };