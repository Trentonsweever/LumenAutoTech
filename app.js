import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import firebaseConfig from './config.js';

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let userLocation = null;
let currentRequestId = null;
let heartbeatTimer;

if ("Notification" in window) { Notification.requestPermission(); }

// 1. Gatekeeper Status
onValue(ref(db, 'system_settings/status'), (snapshot) => {
    const status = snapshot.val();
    const formSection = document.getElementById('request-section');
    const gatekeeper = document.getElementById('gatekeeper-msg');
    if (status === "break") {
        formSection.style.display = "none";
        gatekeeper.style.display = "block";
        gatekeeper.innerHTML = `<div class="status-card"><h2>Tech on Break</h2><p>Lumen Auto Tech is finishing active calls. Back online shortly.</p></div>`;
    } else if (status === "off") {
        formSection.style.display = "none";
        gatekeeper.style.display = "block";
        gatekeeper.innerHTML = `<h2>Closed</h2><p>Lumen Auto Tech is currently offline.</p>`;
    } else {
        formSection.style.display = "block";
        gatekeeper.style.display = "none";
    }
});

// 2. Form Toggles
document.querySelectorAll('input[name="on_interstate"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        document.getElementById('interstate-details').style.display = e.target.value === 'yes' ? 'block' : 'none';
    });
});

// 3. GPS Logic
document.getElementById('geo-btn').addEventListener('click', () => {
    const status = document.getElementById('location-status');
    status.textContent = "Locating...";
    navigator.geolocation.getCurrentPosition((pos) => {
        userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        status.textContent = "✅ Location Pinned!";
        status.style.color = "#28a745";
    }, () => {
        status.textContent = "❌ GPS Error. Enable location.";
    });
});

// 4. Submit & Monitoring
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
        location: userLocation || {lat: 0, lng: 0},
        status: 'pending',
        timestamp: Date.now()
    });

    document.getElementById('request-section').style.display = 'none';
    document.getElementById('status-section').style.display = 'block';

    // Start 10-min heartbeat
    heartbeatTimer = setTimeout(() => {
        if (confirm("Lumen Tech: Are you still at your location?")) { location.reload(); }
        else { update(ref(db, 'requests/' + currentRequestId), { status: 'cancelled' }); location.reload(); }
    }, 10 * 60 * 1000);

    onValue(ref(db, 'requests/' + currentRequestId), (snap) => {
        const data = snap.val();
        const statusBox = document.getElementById('eta-box');
        if (!data) { statusBox.innerHTML = "<span style='color:red;'>Declined / Unavailable</span>"; return; }
        if (data.status === 'accepted') {
            clearTimeout(heartbeatTimer);
            statusBox.innerHTML = "<span style='color:green;'>Lumen Tech En Route!</span>";
            if (Notification.permission === "granted") {
                new Notification("Lumen Auto Tech", { body: "We are on the way!", icon: "logo.png" });
            }
            new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg').play();
        }
    });
});

window.cancelRequest = function() {
    if (currentRequestId && confirm("Cancel your request?")) {
        update(ref(db, 'requests/' + currentRequestId), { status: 'cancelled' });
        location.reload();
    }
};

