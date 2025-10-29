import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, getDocs, addDoc, query, where, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let currentUser = null;

// Initialize hub page
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    loadContent();
    setupFilters();
});

async function loadContent(category = 'all', searchTerm = '') {
    const contentGrid = document.getElementById('contentGrid');
    const loadingMessage = document.getElementById('loadingMessage');
    const noContentMessage = document.getElementById('noContentMessage');

    contentGrid.innerHTML = '';
    loadingMessage.style.display = 'block';
    noContentMessage.style.display = 'none';

    try {
        let contentQuery = collection(db, "content");
        
        // Apply category filter if not 'all'
        if (category !== 'all') {
            contentQuery = query(contentQuery, where("type", "==", category));
        }

        const querySnapshot = await getDocs(contentQuery);
        loadingMessage.style.display = 'none';

        if (querySnapshot.empty) {
            noContentMessage.style.display = 'block';
            return;
        }

        let contentArray = [];
        querySnapshot.forEach(doc => {
            contentArray.push({ id: doc.id, ...doc.data() });
        });

        // Apply search filter if provided
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            contentArray = contentArray.filter(item => 
                item.title.toLowerCase().includes(searchLower) ||
                item.description.toLowerCase().includes(searchLower) ||
                (item.tags && item.tags.some(tag => tag.toLowerCase().includes(searchLower))) ||
                item.authorName.toLowerCase().includes(searchLower)
            );
        }

        if (contentArray.length === 0) {
            noContentMessage.style.display = 'block';
            return;
        }

        // Display content
        contentArray.forEach(item => {
            const card = createContentCard(item);
            contentGrid.appendChild(card);
        });

    } catch (error) {
        console.error('Error loading content:', error);
        loadingMessage.style.display = 'none';
        contentGrid.innerHTML = '<p>Error loading content. Please refresh the page.</p>';
    }
}

function createContentCard(content) {
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
                ${content.fileURL ? `<a href="${content.fileURL}" target="_blank" class="btn-read">Read</a>` : ''}
                ${currentUser ? `<button class="btn-save" onclick="saveContent('${content.id}')">Save</button>` : ''}
                ${content.price > 0 && currentUser ? `<button class="btn-buy" onclick="purchaseContent('${content.id}')">Purchase</button>` : ''}
                ${!currentUser ? '<a href="login.html" class="btn-read">Login to Save</a>' : ''}
            </div>
        </div>
    `;
    
    return card;
}

function setupFilters() {
    // Category filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            loadContent(this.dataset.category);
        });
    });

    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchContent();
            }
        });
    }
}

window.searchContent = function() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value;
    const activeTab = document.querySelector('.filter-tab.active');
    const activeCategory = activeTab ? activeTab.dataset.category : 'all';
    loadContent(activeCategory, searchTerm);
}

window.saveContent = async function(contentId) {
    if (!currentUser) {
        alert('Please log in to save content.');
        return;
    }

    try {
        // Check if already saved
        const saveQuery = query(
            collection(db, "saved_items"), 
            where("userId", "==", currentUser.uid),
            where("contentId", "==", contentId)
        );
        const existingSave = await getDocs(saveQuery);

        if (!existingSave.empty) {
            alert('This content is already in your saved items.');
            return;
        }

        await addDoc(collection(db, "saved_items"), {
            userId: currentUser.uid,
            contentId: contentId,
            savedAt: new Date()
        });

        alert('Content saved to your library!');
    } catch (error) {
        console.error('Error saving content:', error);
        alert('Error saving content: ' + error.message);
    }
}

window.purchaseContent = async function(contentId) {
    if (!currentUser) {
        alert('Please log in to purchase content.');
        return;
    }

    try {
        const contentDoc = await getDoc(doc(db, "content", contentId));
        if (!contentDoc.exists()) {
            alert('Content not found.');
            return;
        }

        const content = contentDoc.data();

        // Check if already purchased
        const purchaseQuery = query(
            collection(db, "user_library"), 
            where("userId", "==", currentUser.uid),
            where("contentId", "==", contentId)
        );
        const existingPurchase = await getDocs(purchaseQuery);

        if (!existingPurchase.empty) {
            alert('You already own this content.');
            return;
        }

        // For now, just add to library (simulate purchase)
        // In a real app, you'd integrate with a payment processor here
        await addDoc(collection(db, "user_library"), {
            userId: currentUser.uid,
            contentId: contentId,
            purchasedAt: new Date(),
            pricePaid: content.price
        });

        alert(`Successfully added "${content.title}" to your library!`);
        
    } catch (error) {
        console.error('Error purchasing content:', error);
        alert('Error purchasing content: ' + error.message);
    }
}