import { auth, db, storage, signInWithEmailAndPassword, onAuthStateChanged, signOut, collection, addDoc, getDocs, deleteDoc, doc, ref, uploadBytes, getDownloadURL } from './firebase.js';

const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const logoutBtn = document.getElementById('logoutBtn');
const loginForm = document.getElementById('loginForm');
const addOfferForm = document.getElementById('addOfferForm');

// Auth State Listener
onAuthStateChanged(auth, (user) => {
    if (user) {
        showDashboard();
    } else {
        showLogin();
    }
});

function showLogin() {
    loginSection.classList.remove('hidden');
    dashboardSection.classList.add('hidden');
    logoutBtn.classList.add('hidden');
}

function showDashboard() {
    loginSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');
    loadAdminOffers();
}

// Login Handler
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('loginError');

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        errorMsg.textContent = error.message;
        errorMsg.style.display = 'block';
    }
});

// Logout Handler
logoutBtn.addEventListener('click', () => {
    signOut(auth);
});

// Get Location Handler
document.getElementById('getCurrentLocBtn').addEventListener('click', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            document.getElementById('offerLat').value = pos.coords.latitude;
            document.getElementById('offerLng').value = pos.coords.longitude;
        });
    } else {
        alert("Geolocation not supported");
    }
});

// Add Offer Handler
addOfferForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = addOfferForm.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = 'Saving...';
    btn.disabled = true;

    try {
        // 1. Upload Image (if selected)
        const fileInput = document.getElementById('offerImage');
        let imageUrl = '';

        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const storageRef = ref(storage, `offers/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            imageUrl = await getDownloadURL(storageRef);
        }

        // 2. Prepare Data
        const offerData = {
            title: document.getElementById('offerTitle').value,
            businessName: document.getElementById('businessName').value,
            discount: document.getElementById('discountText').value,
            category: document.getElementById('offerCategory').value,
            latitude: parseFloat(document.getElementById('offerLat').value),
            longitude: parseFloat(document.getElementById('offerLng').value),
            isPremium: document.getElementById('isPremium').checked,
            imageUrl: imageUrl,
            validTill: new Date(Date.now() + document.getElementById('validDays').value * 86400000),
            createdAt: new Date(),
            popularity: 0
        };

        // 3. Save to Firestore
        await addDoc(collection(db, "offers"), offerData);

        // 4. Reset & Reload
        addOfferForm.reset();
        loadAdminOffers();
        alert("Offer Added Successfully!");

    } catch (error) {
        console.error(error);
        alert("Error adding offer: " + error.message);
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
});

// Load Offers
async function loadAdminOffers() {
    const list = document.getElementById('adminOffersList');
    list.innerHTML = 'Loading...';

    try {
        const snapshot = await getDocs(collection(db, "offers"));
        if (snapshot.empty) {
            list.innerHTML = '<p>No offers found.</p>';
            return;
        }

        list.innerHTML = '';
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const div = document.createElement('div');
            div.className = 'offer-item';
            div.innerHTML = `
                <div>
                    <strong>${data.title}</strong> (${data.businessName})<br>
                    <small>${data.isPremium ? '⭐ Premium' : 'Normal'} | ${data.category}</small>
                </div>
                <button class="btn btn-danger" onclick="deleteOffer('${docSnap.id}')">Delete</button>
            `;
            list.appendChild(div);
        });
    } catch (error) {
        list.innerHTML = '<p>Error loading data (Auth required?)</p>';
        console.error(error);
    }
}

// Global Delete Function
window.deleteOffer = async (id) => {
    if (!confirm("Are you sure?")) return;

    try {
        await deleteDoc(doc(db, "offers", id));
        loadAdminOffers();
    } catch (error) {
        alert("Error deleting: " + error.message);
    }
};
