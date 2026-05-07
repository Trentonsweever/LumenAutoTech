import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import firebaseConfig from './config.js';

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let userLocation = null;

// Interstate Toggle Logic
const iCheck = document.querySelectorAll('input[name="on_interstate"]');
iCheck.forEach(radio => {
    radio.addEventListener('change', (e) => {
        document.getElementById('interstate-details').style.display = e.target.value === 'yes' ? 'block' : 'none';
    });
});

// GPS Button
document.getElementById('geo-btn').addEventListener('click', () => {
    const status = document.getElementById('location-status');
    status.textContent = "Locating...";
    navigator.geolocation.getCurrentPosition((pos) => {
        userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        status.textContent = "✅ Location Pinned!";
        status.style.color = "#28a745";
    }, () => {
        status.textContent = "❌ GPS Error";
    });
});

// Form Submission
document.getElementById('help-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const requestId = Date.now().toString();

    // Save Data to Realtime Database
    await set(ref(db, 'requests/' + requestId), {
        name: document.getElementById('cust-name').value,
        phone: document.getElementById('cust-phone').value,
        service: document.getElementById('service-type').value,
        direction: document.getElementById('direction').value,
        mile_marker: document.getElementById('mile-marker').value,
        location: userLocation,
        timestamp: Date.now(),
        status: 'pending'
    });

    document.getElementById('request-section').style.display = 'none';
    document.getElementById('status-section').style.display = 'block';
});

