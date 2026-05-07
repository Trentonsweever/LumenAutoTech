let userLocation = null;

// 1. Get Customer GPS
function getLocation() {
    const status = document.getElementById('location-status');
    if (!navigator.geolocation) {
        status.textContent = "Geolocation not supported";
    } else {
        status.textContent = "Locating...";
        navigator.geolocation.getCurrentPosition((position) => {
            userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            status.textContent = "✅ Location Pinned!";
            status.style.color = "#28a745";
        });
    }
}

// 2. Handle the Payment & Dispatch
document.getElementById('help-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    if (!userLocation) {
        alert("Please pin your location first!");
        return;
    }

    // In a real scenario, you'd trigger Square/Stripe here.
    // For now, we simulate the "Success"
    alert("Payment successful! Dispatching Lumen Auto Tech.");
    
    // Switch Views
    document.getElementById('request-section').style.display = 'none';
    document.getElementById('status-section').style.display = 'block';
    
    // Start listening to Firebase for "Your Status"
    startTracking();
});

function startTracking() {
    // This is where you would use Firebase's onValue() function
    // to listen for when YOU (the admin) change the status to "En Route"
    console.log("Listening for technician updates...");
}

