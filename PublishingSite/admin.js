import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, updateDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

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
const storage = getStorage(app);

// Check if user is admin
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  // Simple admin check - replace with your email
  if (user.email !== "khosapromise12@gmail.com") {
    alert("Access denied. Admin only.");
    window.location.href = "dashboard.html";
    return;
  }

  loadPendingContent();
  loadPlatformStats();
  setupAdminUpload();
});

// Load content waiting for approval
async function loadPendingContent() {
  const pendingContainer = document.getElementById('pendingContent');
  pendingContainer.innerHTML = '';

  const q = query(collection(db, "content"), where("status", "==", "pending_review"));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    pendingContainer.innerHTML = '<p>No content pending review.</p>';
    return;
  }

  querySnapshot.forEach(doc => {
    const data = doc.data();
    const card = document.createElement("div");
    card.className = "content-card";
    card.innerHTML = `
      <img src="${data.coverURL || 'https://via.placeholder.com/200x250?text=No+Image'}" 
           alt="${data.title}">
      <h3>${data.title}</h3>
      <p class="content-type">${data.type.toUpperCase()}</p>
      <p>By: ${data.authorName}</p>
      <p>${data.description}</p>
      <div class="card-actions">
        <button class="btn-view" onclick="viewContentDetails('${doc.id}')">Review</button>
        <button class="btn-read" onclick="approveContent('${doc.id}')">Approve</button>
        <button class="btn-purchase" onclick="rejectContent('${doc.id}')">Reject</button>
      </div>
    `;
    pendingContainer.appendChild(card);
  });
}

// Load platform statistics
async function loadPlatformStats() {
  // Total users
  const usersSnapshot = await getDocs(collection(db, "users"));
  document.getElementById('totalUsers').textContent = usersSnapshot.size;

  // Pending content count
  const pendingQuery = query(collection(db, "content"), where("status", "==", "pending_review"));
  const pendingSnapshot = await getDocs(pendingQuery);
  document.getElementById('pendingCount').textContent = pendingSnapshot.size;

  // Total content
  const contentSnapshot = await getDocs(collection(db, "content"));
  document.getElementById('totalContent').textContent = contentSnapshot.size;
}

// Admin upload functionality
function setupAdminUpload() {
  const adminUploadForm = document.getElementById('adminUploadForm');
  const adminUploadStatus = document.getElementById('adminUploadStatus');

  adminUploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const user = auth.currentUser;
    const title = document.getElementById('adminContentTitle').value;
    const description = document.getElementById('adminContentDescription').value;
    const type = document.getElementById('adminContentType').value;
    const price = parseFloat(document.getElementById('adminContentPrice').value) || 0;
    const coverFile = document.getElementById('adminContentCover').files[0];
    const contentFile = document.getElementById('adminContentFile').files[0];

    try {
      adminUploadStatus.innerHTML = '<p style="color: blue;">Publishing...</p>';

      let coverURL = '';
      let fileURL = '';

      if (coverFile) {
        const coverRef = ref(storage, `adminContent/covers/${Date.now()}_${coverFile.name}`);
        const coverSnapshot = await uploadBytes(coverRef, coverFile);
        coverURL = await getDownloadURL(coverSnapshot.ref);
      }

      if (contentFile) {
        const fileRef = ref(storage, `adminContent/files/${Date.now()}_${contentFile.name}`);
        const fileSnapshot = await uploadBytes(fileRef, contentFile);
        fileURL = await getDownloadURL(fileSnapshot.ref);
      }

      // Add to Firestore with admin privileges
      await addDoc(collection(db, "content"), {
        title: title,
        description: description,
        type: type,
        coverURL: coverURL,
        fileURL: fileURL,
        price: price,
        authorId: user.uid,
        authorName: "ArtHub Official",
        createdAt: new Date(),
        status: 'published',
        featured: type === 'featured',
        isOfficial: true
      });

      adminUploadStatus.innerHTML = '<p style="color: green;">Content published successfully!</p>';
      adminUploadForm.reset();
      loadPlatformStats(); // Refresh stats

    } catch (error) {
      adminUploadStatus.innerHTML = `<p style="color: red;">Publish failed: ${error.message}</p>`;
    }
  });
}

// Admin functions
window.approveContent = async (contentId) => {
  await updateDoc(doc(db, "content", contentId), {
    status: 'published',
    approvedAt: new Date(),
    approvedBy: auth.currentUser.uid
  });
  alert('Content approved and published!');
  loadPendingContent();
  loadPlatformStats();
};

window.rejectContent = async (contentId) => {
  const reason = prompt('Reason for rejection:');
  if (reason) {
    await updateDoc(doc(db, "content", contentId), {
      status: 'rejected',
      rejectionReason: reason
    });
    alert('Content rejected.');
    loadPendingContent();
    loadPlatformStats();
  }
};

window.viewAllUsers = async () => {
  const usersList = document.getElementById('usersList');
  usersList.innerHTML = '<p>Loading users...</p>';

  const querySnapshot = await getDocs(collection(db, "users"));
  usersList.innerHTML = '<h3>Registered Users</h3>';
  
  querySnapshot.forEach(doc => {
    const user = doc.data();
    const userElement = document.createElement('div');
    userElement.className = 'user-item';
    userElement.innerHTML = `
      <p><strong>${user.firstName}</strong> (${user.email}) - ${user.userType} 
      - Sub: ${user.subscriptionStatus || 'none'}</p>
    `;
    usersList.appendChild(userElement);
  });
};

// Logout
document.getElementById("logoutBtn").addEventListener("click", () => {
  signOut(auth).then(() => window.location.href = "login.html");
});
