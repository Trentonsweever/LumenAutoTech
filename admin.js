/* ==========================================
   LUMEN COMMAND - ADMIN LOGIC
   ========================================== */

let isOnDuty = false;
let currentJob = null; 

// 1. DUTY TOGGLE
function toggleDuty() {
    const btn = document.getElementById('duty-toggle');
    isOnDuty = !isOnDuty;
    
    if (isOnDuty) {
        btn.textContent = "ON DUTY";
        btn.className = "on-duty";
        console.log("Lumen Auto Tech is now active on I-30.");
        // startLocationBroadcast(); // This will connect to Firebase later
    } else {
        btn.textContent = "OFF DUTY";
        btn.className = "off-duty";
    }
}

// 2. PROXIMITY & AUTO-DIALER LOGIC
// This runs in the background while you drive
function checkProximity(myLat, myLng, custLat, custLng) {
    const distance = calculateDistance(myLat, myLng, custLat, custLng);
    
    // If you are within 0.2 miles (approx 30-60 seconds out)
    if (distance < 0.2) {
        triggerArrivalAlert();
    }
}

function triggerArrivalAlert() {
    // Haptic feedback for your Moto G
    if (navigator.vibrate) navigator.vibrate([500, 110, 500]);

    const dialBtn = document.querySelector('.geo-btn[style*="28a745"]');
    if (dialBtn) {
        dialBtn.innerHTML = "🚨 ARRIVING - CALL CUSTOMER NOW";
        dialBtn.style.animation = "pulse 1s infinite";
    }
}

// 3. NAVIGATION
function startNavigation() {
    if (currentJob && currentJob.location) {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${currentJob.location.lat},${currentJob.location.lng}`;
        window.open(url, '_blank');
    } else {
        alert("No active job location found.");
    }
}

// 4. THE MATH (Haversine Formula)
// Calculates distance between you and the customer in miles
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3958.8; // Radius of the Earth in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// 5. JOB COMPLETION
function completeJob() {
    if (confirm("Confirming all lugs are torqued and job is complete?")) {
        alert("Job Archived. Square Invoice generated.");
        // This will eventually clear the data in Firebase
        location.reload(); 
    }
}

