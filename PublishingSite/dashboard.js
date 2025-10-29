import { auth, db, storage } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, getDocs, query, where, addDoc, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

let currentUser = null;
let userData = null;

// Initialize dashboard
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    currentUser = user;
    await loadUserData(user.uid);
    setupDashboard();
});

async function loadUserData(uid) {
    const userDoc = await getDoc(doc(db, "users", uid));
    userData = userDoc.exists() ? userDoc.data() : {};
    
    // Update welcome message
    document.getElementById('welcomeMessage').textContent = `Welcome back, ${userData.firstName || 'Scholar'}!`;
    document.getElementById('userRole').textContent = `Role: ${userData.userType === 'author' ? 'Author & Creator' : 'Knowledge Seeker'}`;
    
    // Show/hide author features
    const authorElements = document.querySelectorAll('.author-only');
    authorElements.forEach(el => {
        el.style.display = userData.userType === 'author' ? 'block' : 'none';
    });

    await loadUserStats();
    await loadLibraryContent();
}

async function loadUserStats() {
    // Load user's library count
    const libraryQuery = query(collection(db, "user_library"), where("userId", "==", currentUser.uid));
    const librarySnapshot = await getDocs(libraryQuery);
    document.getElementById('booksCount').textContent = librarySnapshot.size;

    // Load saved items count
    const savedQuery = query(collection(db, "saved_items"), where("userId", "==", currentUser.uid));
    const savedSnapshot = await getDocs(savedQuery);
    document.getElementById('savedCount').textContent = savedSnapshot.size;

    // Load reward points
    document.getElementById('pointsCount').textContent = userData.rewardPoints || 0;

    // Load author stats
    if (userData.userType === 'author') {
        const uploadsQuery = query(collection(db, "content"), where("authorId", "==", currentUser.uid));
        const uploadsSnapshot = await getDocs(uploadsQuery);
        document.getElementById('uploadsCount').textContent = uploadsSnapshot.size;
    }
}

async function loadLibraryContent() {
    const libraryContainer = document.getElementById('libraryContent');
    libraryContainer.innerHTML = '<p>Loading your library...</p>';

    try {
        const libraryQuery = query(collection(db, "user_library"), where("userId", "==", currentUser.uid));
        const librarySnapshot = await getDocs(libraryQuery);
        
        if (librarySnapshot.empty) {
            libraryContainer.innerHTML = '<p>Your library is empty. Start exploring The Hub!</p>';
            return;
        }

        libraryContainer.innerHTML = '';
        for (const libDoc of librarySnapshot.docs) {
            const libData = libDoc.data();
            const contentDoc = await getDoc(doc(db, "content", libData.contentId));
            
            if (contentDoc.exists()) {
                const content = contentDoc.data();
                const card = createContentCard(content, contentDoc.id);
                libraryContainer.appendChild(card);
            }
        }
    } catch (error) {
        libraryContainer.innerHTML = '<p>Error loading library. Please try again.</p>';
    }
}

function createContentCard(content, contentId) {
    const card = document.createElement('div');
    card.className = 'content-card';
    card.innerHTML = `
        <img src="${content.coverURL || 'https://via.placeholder.com/300x400?text=No+Cover'}" 
             alt="${content.title}" class="content-image">
        <div class="content-info">
            <span class="content-type">${content.type.toUpperCase()}</span>
            <h3 class="content-title">${content.title}</h3>
            <p class="content-description">${content.description}</p>
            <div class="content-meta">
                <span class="content-price">${content.price === 0 ? 'FREE' : '$' + content.price}</span>
                <span class="content-author">By ${content.authorName}</span>
            </div>
            <div class="content-actions">
                <a href="${content.fileURL}" target="_blank" class="btn-read">Read</a>
                <button class="btn-save" onclick="saveContent('${contentId}')">Save</button>
            </div>
        </div>
    `;
    return card;
}

// Tab management
window.showTab = (tabName) => {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName + 'Tab').classList.add('active');
    
    // Load tab content if needed
    if (tabName === 'saved') loadSavedContent();
    if (tabName === 'myWorks') loadMyWorks();
};

window.toggleDropdown = () => {
    document.getElementById('userDropdown').classList.toggle('show');
};

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu')) {
        document.getElementById('userDropdown').classList.remove('show');
    }
});

// Upload functionality
window.showUploadForm = () => {
    showTab('upload');
};

document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const uploadStatus = document.getElementById('uploadStatus');
    const formData = new FormData();
    
    const contentData = {
        type: document.getElementById('contentType').value,
        title: document.getElementById('contentTitle').value,
        description: document.getElementById('contentDescription').value,
        price: parseFloat(document.getElementById('contentPrice').value) || 0,
        category: document.getElementById('contentCategory').value,
        tags: document.getElementById('contentTags').value.split(',').map(tag => tag.trim()),
        authorId: currentUser.uid,
        authorName: userData.penName || currentUser.displayName,
        status: 'published',
        createdAt: new Date()
    };

    const coverFile = document.getElementById('contentCover').files[0];
    const contentFile = document.getElementById('contentFile').files[0];

    if (!contentFile) {
        uploadStatus.innerHTML = '<p style="color: red;">Please select a content file.</p>';
        return;
    }

    try {
        uploadStatus.innerHTML = '<p style="color: blue;">Uploading your content...</p>';

        // Upload cover image if provided
        if (coverFile) {
            const coverRef = ref(storage, `covers/${currentUser.uid}/${Date.now()}_${coverFile.name}`);
            const coverSnapshot = await uploadBytes(coverRef, coverFile);
            contentData.coverURL = await getDownloadURL(coverSnapshot.ref);
        }

        // Upload content file
        const fileRef = ref(storage, `content/${currentUser.uid}/${Date.now()}_${contentFile.name}`);
        const fileSnapshot = await uploadBytes(fileRef, contentFile);
        contentData.fileURL = await getDownloadURL(fileSnapshot.ref);

        // Save to Firestore
        await addDoc(collection(db, "content"), contentData);

        uploadStatus.innerHTML = '<p style="color: green;">Content published successfully!</p>';
        document.getElementById('uploadForm').reset();
        
        // Update stats
        await loadUserStats();

    } catch (error) {
        uploadStatus.innerHTML = `<p style="color: red;">Upload failed: ${error.message}</p>`;
    }
});

// Save content function
window.saveContent = async (contentId) => {
    try {
        await addDoc(collection(db, "saved_items"), {
            userId: currentUser.uid,
            contentId: contentId,
            savedAt: new Date()
        });
        alert('Content saved to your library!');
        await loadUserStats();
    } catch (error) {
        alert('Error saving content: ' + error.message);
    }
};

async function loadSavedContent() {
    const savedContainer = document.getElementById('savedContent');
    savedContainer.innerHTML = '<p>Loading saved items...</p>';

    try {
        const savedQuery = query(collection(db, "saved_items"), where("userId", "==", currentUser.uid));
        const savedSnapshot = await getDocs(savedQuery);
        
        if (savedSnapshot.empty) {
            savedContainer.innerHTML = '<p>No saved items yet.</p>';
            return;
        }

        savedContainer.innerHTML = '';
        for (const savedDoc of savedSnapshot.docs) {
            const savedData = savedDoc.data();
            const contentDoc = await getDoc(doc(db, "content", savedData.contentId));
            
            if (contentDoc.exists()) {
                const content = contentDoc.data();
                const card = createContentCard(content, contentDoc.id);
                savedContainer.appendChild(card);
            }
        }
    } catch (error) {
        savedContainer.innerHTML = '<p>Error loading saved items.</p>';
    }
}

async function loadMyWorks() {
    const worksContainer = document.getElementById('myWorksContent');
    worksContainer.innerHTML = '<p>Loading your works...</p>';

    try {
        const worksQuery = query(collection(db, "content"), where("authorId", "==", currentUser.uid));
        const worksSnapshot = await getDocs(worksQuery);
        
        if (worksSnapshot.empty) {
            worksContainer.innerHTML = '<p>You haven\'t published any works yet.</p>';
            return;
        }

        worksContainer.innerHTML = '';
        worksSnapshot.forEach(doc => {
            const content = doc.data();
            const card = createContentCard(content, doc.id);
            worksContainer.appendChild(card);
        });
    } catch (error) {
        worksContainer.innerHTML = '<p>Error loading your works.</p>';
    }
}

// Initialize first tab
function setupDashboard() {
    showTab('library');
}

