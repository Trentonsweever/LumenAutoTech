import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import firebaseConfig from './config.js';

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let userLocation = null;
let currentRequestId = null;

// 1. Monitor active jobs for the waitlist
let activeJobsCount = 0;
onValue(ref(db, 'requests'), (snap) => {
    const data = snap.val();
    activeJobsCount = 0;
    if (data) {
        Object.values(data).forEach(req => {
            if (req.status === 'accepted') activeJobsCount++;
        });
    }
});

// 2. Toggles
document.querySelectorAll('input[name="on_interstate"]').forEach(r => {
    r.addEventListener('change', e => document.getElementById('interstate-details').style.display = e.target.value === 'yes' ? 'block' : 'none');
});

document.getElementById('geo-btn').addEventListener('click', () => {
    navigator.geolocation.getCurrentPosition(p => {
        userLocation = { lat: p.coords.latitude, lng: p.coords.longitude };
        document.getElementById('location-status').textContent = "✅ GPS Linked";
    });
});

// 3. Submit
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
        location: userLocation || {lat:0, lng:0},
        status: 'pending',
        timestamp: Date.now()
    });

    document.getElementById('request-section').style.display = 'none';
    document.getElementById('status-section').style.display = 'block';

    // Heartbeat for Waitlist UI
    onValue(ref(db, 'requests/' + currentRequestId), (snap) => {
        const data = snap.val();
        if (!data) return;

        const pill = document.getElementById('status-pill');
        const title = document.getElementById('status-title');
        const body = document.getElementById('status-body');

        if (data.status === 'pending') {
            if (activeJobsCount > 0) {
                pill.className = "status-pill waitlist";
                pill.textContent = "WAITLISTED";
                title.textContent = "You're in Queue";
                body.textContent = "Technician is on another call. You are currently #1 in line.";
            } else {
                pill.className = "status-pill pending";
                pill.textContent = "PENDING";
                title.textContent = "Dispatching...";
                body.textContent = "Technician is reviewing your location.";
            }
        } else if (data.status === 'accepted') {
            pill.className = "status-pill enroute";
            pill.textContent = "EN ROUTE";
            title.textContent = "Help is Coming!";
            body.textContent = "Lumen Tech is moving to your location. Keep hazards on.";
            document.getElementById('tech-link').style.display = "block";
            new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg').play();
        } else if (data.status === 'completed') {
            pill.className = "status-pill enroute";
            pill.style.background = "var(--success)";
            pill.textContent = "FINISHED";
            title.textContent = "Mission Complete";
            body.innerHTML = "Service finalized. Drive safe!<br><br><b>Total: $25.00 Dispatch Fee</b>";
            document.getElementById('cancel-btn').style.display = "none";
        }
    });
});

window.cancelRequest = function() {
    if (confirm("Cancel?")) { update(ref(db, 'requests/'+currentRequestId), {status:'cancelled'}); location.reload(); }
};

