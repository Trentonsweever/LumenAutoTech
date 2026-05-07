import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import firebaseConfig from './config.js';

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let userLocation = null;
let currentRequestId = null;
let myTimestamp = null;

// --- GATEKEEPER ---
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

// --- UI HELPERS ---
document.querySelectorAll('input[name="on_interstate"]').forEach(r => {
    r.addEventListener('change', e => document.getElementById('interstate-details').style.display = e.target.value === 'yes' ? 'block' : 'none');
});

document.getElementById('geo-btn').addEventListener('click', () => {
    navigator.geolocation.getCurrentPosition(p => {
        userLocation = { lat: p.coords.latitude, lng: p.coords.longitude };
        document.getElementById('location-status').textContent = "✅ GPS Linked";
    }, () => { alert("Please enable location services."); });
});

// --- SUBMISSION & QUEUE ---
document.getElementById('help-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    currentRequestId = Date.now().toString();
    myTimestamp = Date.now();
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
        timestamp: myTimestamp
    });

    document.getElementById('request-section').style.display = 'none';
    document.getElementById('status-section').style.display = 'block';

    onValue(ref(db, 'requests'), (snap) => {
        const allData = snap.val();
        if (!allData || !allData[currentRequestId]) return;

        const myData = allData[currentRequestId];
        const pill = document.getElementById('status-pill');
        const title = document.getElementById('status-title');
        const body = document.getElementById('status-body');

        const othersAhead = Object.values(allData).filter(req => 
            (req.status === 'accepted' || req.status === 'pending') && req.timestamp < myTimestamp
        );
        const myPosition = othersAhead.length + 1;

        if (myData.status === 'pending') {
            pill.className = "status-pill waitlist";
            pill.textContent = "WAITING";
            title.textContent = (myPosition > 1) ? "Waitlist Active" : "Dispatching...";
            body.innerHTML = (myPosition > 1) ? `Technician Busy. <b>Position: #${myPosition}</b>` : "Reviewing your request now...";
        } else if (myData.status === 'accepted') {
            if (myPosition > 1) {
                // THE "QUEUED" ACCEPTED STATE
                pill.className = "status-pill enroute";
                pill.style.background = "#007bff"; // Blue for "Claimed/Accepted"
                pill.textContent = "CLAIMED";
                title.textContent = "You're in the Queue!";
                body.innerHTML = `Lumen Tech has <b>accepted</b> your job. <br><b>Help will be coming</b> after the current dispatch is finished. <br>Your Position: #${myPosition}`;
                document.getElementById('tech-link').style.display = "block";
            } else {
                // THE "ACTIVE" ACCEPTED STATE
                pill.className = "status-pill enroute";
                pill.style.background = "#28a745"; // Green for "Moving"
                pill.textContent = "EN ROUTE";
                title.textContent = "Help is Coming!";
                body.innerHTML = "Lumen Tech is <b>now moving</b> to your location.<br><b>Stay in your vehicle.</b>";
                document.getElementById('tech-link').style.display = "block";
            }
        } else if (myData.status === 'completed') {
            pill.textContent = "FINISHED";
            title.textContent = "Mission Complete";
            body.innerHTML = "Service finalized. Drive safe!<br><br><b>Total: $25.00 Dispatch Fee</b>";
            document.getElementById('cancel-btn').style.display = "none";
        } else if (myData.status.startsWith('cancelled_')) {
            pill.textContent = "CLOSED"; pill.style.background = "#444";
            title.textContent = "Request Closed";
            body.innerHTML = `Reason: ${myData.reason || 'Service unavailable'}`;
            document.getElementById('cancel-btn').style.display = "none";
        }
    });
});

window.cancelRequest = function() {
    if (confirm("Cancel help request?")) { update(ref(db, 'requests/'+currentRequestId), {status:'cancelled'}); location.reload(); }
};

