import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Update navigation based on auth state
onAuthStateChanged(auth, async (user) => {
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const userNav = document.getElementById('userNav');
    
    if (user) {
        // User is logged in
        if (loginBtn) loginBtn.style.display = 'none';
        if (registerBtn) registerBtn.style.display = 'none';
        if (userNav) userNav.style.display = 'block';
        
        // Check if user is admin (khosapromise12@gmail.com)
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.exists() ? userDoc.data() : {};
        
        if (user.email === "your-admin-email@rejoicehouse.com" || userData.userType === 'admin') {
            // Add admin link to navigation if it doesn't exist
            if (!document.querySelector('#adminLink')) {
                const adminLink = document.createElement('a');
                adminLink.href = 'admin.html';
                adminLink.className = 'btn-dashboard';
                adminLink.id = 'adminLink';
                adminLink.textContent = 'Admin Panel';
                adminLink.style.marginLeft = '10px';
                userNav.appendChild(adminLink);
            }
        }
    } else {
        // User is logged out
        if (loginBtn) loginBtn.style.display = 'block';
        if (registerBtn) registerBtn.style.display = 'block';
        if (userNav) userNav.style.display = 'none';
        
        // Remove admin link if exists
        const adminLink = document.querySelector('#adminLink');
        if (adminLink) adminLink.remove();
    }
});

// Global logout function
window.logoutUser = async () => {
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
};