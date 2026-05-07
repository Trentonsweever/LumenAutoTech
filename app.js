import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import firebaseConfig from './config.js';

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let userLocation = null;
let currentRequestId = null;
let heartbeatTimer;

// 1. NOTIFICATIONS: Ask for permission immediately
if ("Notification" in window) {
    Notification.requestPermission();
}

// 2. GATEKEEPER: Check if Tech is On Duty, Off, or on Break
onValue(ref(db, 'system_settings/status'), (snapshot) => {
    const status = snapshot.val();
    const formSection = document.getElementById('request-section');
    const gatekeeper = document.getElementById('gatekeeper-msg');

    if (status === "break") {
        formSection.style.display = "none";
        gatekeeper.style.display = "block";
        gatekeeper.innerHTML = `<div class="status-card"><h2>Technician on Break</h2><p>Lumen Auto Tech is finishing active calls. Back online shortly.</p><button onclick="location.reload()" class="geo-btn">Check Again</button></div>`;
    } else if (status === "off") {
        formSection.style.display = "none";
        gatekeeper.style.display = "block";
        gatekeeper.innerHTML = `<h2>Closed</h2><p>Lumen Auto Tech is currently offline for the day.</p>`;
    } else {
        formSection.style.display = "block";
        gatekeeper.style.display = "none";
    }
});

// 3. INTERSTATE TOGGLE: Show/Hide direction based on radio buttons
document.querySelectorAll('input[name="on_interstate"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        const details = document.getElementById('interstate-details');
        details.style.display = e.target.value === 'yes' ? 'block' : 'none';
    });
});

// 4. GPS: Pin exact location
document.getElementById('geo-btn').addEventListener('click', () => {
    const status = document.getElementById('location-status');
    status.textContent = "Locating...";
    navigator.geolocation.getCurrentPosition((pos) => {
        userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        status.textContent = "✅ Location Pinned!";
        status.style.color = "#28a745";
    }, (err) => {
        status.textContent = "❌ GPS Error. Please enable location.";
    });
});

// 5. HEARTBEAT: The "Still there?" check after 10 mins
function startHeartbeat(requestId) {
    heartbeatTimer = setTimeout(() => {
        if (confirm("Lumen Tech: Are you still at your location? Click 'OK' to keep waiting.")) {
            startHeartbeat(requestId);
        } else {
            update(ref(db, 'requests/' + requestId), { status: 'cancelled' });
            location.reload();
        }
    }, 10 * 60 * 1000); 
}

// 6. SUBMIT: Send data to Firebase
document.getElementById('help-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    currentRequestId = Date.now().toString();
    const isInterstate = document.querySelector('input[name="on_interstate"]:checked').value;

    await set(ref(db, 'requests/' + currentRequestId), {
        name: document.getElementById('cust-name').value,
        phone: document.getElementById('cust-phone').value,
        service: document.getElementById('service-type').value,
        on_interstate: isInterstate,
        direction: isInterstate === 'yes' ? document.getElementById('direction').value : 'N/A',
        mile_marker: isInterstate === 'yes' ? document.getElementById('mile-marker').value : 'Local',
        location: userLocation,
        status: 'pending',
        timestamp: Date.now()
    });

    document.getElementById('request-section').style.display = 'none';
    document.getElementById('status-section').style.display = 'block';

    // Start the 10-minute check-in
    startHeartbeat(currentRequestId);

    // 7. MONITOR: Listen for Tech Accept or Decline
    onValue(ref(db, 'requests/' + currentRequestId), (snap) => {
        const data = snap.val();
        const statusBox = document.getElementById('eta-box');
        
        if (!data) {
            statusBox.innerHTML = "<b style='color:red;'>Request Declined.</b> Too far or tech unavailable.";
            clearTimeout(heartbeatTimer);
            return;
        }

        if (data.status === 'accepted') {
            clearTimeout(heartbeatTimer); // Stop asking "Are you there?"
            statusBox.innerHTML = "<b style='color:green;'>Lumen Tech En Route!</b><br>Stay in your vehicle.";
            
            // Notification & Sound
            if (Notification.permission === "granted") {
                new Notification("Lumen Auto Tech", { body: "We are on the way!", icon: "logo.png" });
            }
            new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg').play();
        }
    });
});

// 8. CANCEL: Let customer back out
window.cancelRequest = function() {
    if (currentRequestId && confirm("Cancel your request?")) {
        update(ref(db, 'requests/' + currentRequestId), { status: 'cancelled' });
        location.reload();
    }
};

