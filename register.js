import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDLhqFt4rYXJgxbu5l4q50rx1FZkARyDYE",
  authDomain: "rejoice-institute-house.firebaseapp.com",
  projectId: "rejoice-institute-house",
  storageBucket: "rejoice-institute-house.firebasestorage.app",
  messagingSenderId: "154515308139",
  appId: "1:154515308139:web:72b2e940af48283c787b2e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const registerForm = document.getElementById("register-form");

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("register-email").value;
  const password = document.getElementById("register-password").value;
  const firstName = document.getElementById("register-name").value;
  const userType = document.getElementById("user-type").value; // 'reader' or 'author'

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    await updateProfile(user, { displayName: firstName });
    
    // Store user data with role
    await setDoc(doc(db, "users", user.uid), {
      firstName: firstName,
      email: email,
      userType: userType, // 'reader', 'author', or 'admin'
      subscriptionStatus: userType === 'author' ? 'pending' : 'none',
      createdAt: new Date()
    });
    
    if (userType === 'author') {
      alert("Author account created! Please complete subscription to publish content.");
      window.location.href = "subscription.html";
    } else {
      alert("Account created successfully! Redirecting to dashboard...");
      window.location.href = "dashboard.html";
    }
  } catch (error) {
    alert(error.message);
  }
});