import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import firebaseConfig from './config.js';

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let userLocation = null;
let currentRequestId = null;
let activeJobsCount = 0;

// 1. MONITOR QUEUE
onValue(ref(db, 'requests'), (snap) => {
    const data = snap.val();
    activeJobsCount = 0;
    if (data) {
        Object.values(data).forEach(req => { if (req.status === 'accepted') activeJobsCount++; });
    }
});

// 2. GATEKEEPER
onValue(ref(db, 'system_settings/status'), (snap) => {
    const s = snap.val() || 'off';
    const form = document.getElementById('request-section');
    const msg = document.getElementById('gatekeeper-msg');
    if (currentRequestId) return; 

    if (s === 'on') {
        form.style.display = "block";
        msg.style.display = "none";
    } else {
        form.style.display = "none";
        msg.style.display = "block";
        msg.innerHTML = `<div class="status-card"><h2>${s === 'break' ? 'TECH ON BREAK' : 'LUMEN IS OFFLINE'}</h2><p>Please check back in a few minutes.</p></div>`;
    }
});

// 3. FORM HELPERS
document.querySelectorAll('input[name="on_interstate"]').forEach(r => {
    r.addEventListener('change', e => document.getElementById('interstate-details').style.display = e.target.value === 'yes' ? 'block' : 'none');
});

document.getElementById('geo-btn').addEventListener('click', () => {
    navigator.geolocation.getCurrentPosition(p => {
        userLocation = { lat: p.coords.latitude, lng: p.coords.longitude };
        document.getElementById('location-status').textContent = "✅ GPS Linked";
    });
});

// 4. SUBMIT & STATUS SYNC
document.getElementById('help-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    currentRequestId = Date.now().toString();
    const isI = document.querySelector('input[name="on_interstate"]:checked').value;

    await set(ref(db, 'requests/' + currentRequestId), {
        name: document.getElementById('cust-name').value,
        phone: document.getElementById('cust-phone').value,
        service: document.getElementById('service-type').value,
        on_interstate: isI,
        direction: isI === 'yes' ? document.getElementById('direction').value : 'N/A',
        mile_marker: isI === 'yes' ? document.getElementById('mile-marker').value : 'Local',
        location: userLocation || {lat: 0, lng: 0},
        status: 'pending',
        timestamp: Date.now()
    });

    document.getElementById('request-section').style.display = 'none';
    document.getElementById('status-section').style.display = 'block';

    onValue(ref(db, 'requests/' + currentRequestId), (snap) => {
        const data = snap.val();
        if (!data) return;

        const pill = document.getElementById('status-pill');
        const title = document.getElementById('status-title');
        const body = document.getElementById('status-body');

        if (data.status === 'pending') {
            if (activeJobsCount > 0) {
                pill.className = "status-pill waitlist"; pill.textContent = "IN QUEUE";
                title.textContent = "Technician Busy";
                body.textContent = "You are currently on the waitlist. We will notify you when we head your way.";
            } else {
                pill.className = "status-pill pending"; pill.textContent = "PENDING";
                title.textContent = "Dispatching...";
                body.textContent = "Wait tight, reviewing your location now.";
            }
        } else if (data.status === 'accepted') {
            pill.className = "status-pill enroute"; pill.textContent = "EN ROUTE";
            title.textContent = "Help is Coming!";
            body.innerHTML = "Lumen Tech is moving to your location.<br><b>Stay in your vehicle.</b>";
            document.getElementById('tech-link').style.display = "block";
        } else if (data.status === 'completed') {
            pill.textContent = "FINISHED";
            title.textContent = "Mission Complete";
            body.innerHTML = "Service finalized. Drive safe!<br><br><b>Total: $25.00 Dispatch Fee</b>";
            document.getElementById('cancel-btn').style.display = "none";
        } else if (data.status.startsWith('cancelled_')) {
            pill.textContent = "CLOSED"; pill.style.background = "#444";
            title.textContent = "Request Closed";
            body.innerHTML = `Reason: ${data.reason || 'Service unavailable'}`;
            document.getElementById('cancel-btn').style.display = "none";
        }
    });
});

window.cancelRequest = function() {
    if (confirm("Cancel?")) { update(ref(db, 'requests/'+currentRequestId), {status:'cancelled'}); location.reload(); }
};

