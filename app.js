const API_URL = "http://127.0.0.1:8000/api";

const CATEGORIES = [
    { name: "Plumbing", icon: "🚰" },
    { name: "Electrical", icon: "⚡" },
    { name: "AC Repair", icon: "❄️" },
    { name: "Carpentry", icon: "🪑" },
    { name: "Appliance Repair", icon: "🧺" }
];

let currentUser = JSON.parse(localStorage.getItem("fixmate_user")) || null;
let activeCategory = "Plumbing";
let selectedTechnician = null;
let techniciansCache = [];

window.onload = () => {
    renderApp();
};

function renderApp() {
    const authView = document.getElementById("authView");
    const customerView = document.getElementById("customerView");
    const technicianView = document.getElementById("technicianView");
    const navActions = document.getElementById("navActions");

    if (!currentUser) {
        authView.classList.remove("hidden");
        customerView.classList.add("hidden");
        technicianView.classList.add("hidden");
        navActions.innerHTML = `<span style="font-size:13px;color:var(--muted)">Please sign in</span>`;
        return;
    }

    authView.classList.add("hidden");
    navActions.innerHTML = `
        <span style="font-size:13px;font-weight:600;">${currentUser.name} (${currentUser.role})</span>
        <button class="btn-outline" onclick="logout()">Logout</button>
    `;

    if (currentUser.role === "customer") {
        customerView.classList.remove("hidden");
        technicianView.classList.add("hidden");
        document.getElementById("custWelcomeName").textContent = currentUser.name;
        renderCategories();
        fetchTechnicians(activeCategory);
        loadCustomerBookings();
    } else {
        technicianView.classList.remove("hidden");
        customerView.classList.add("hidden");
        loadTechnicianConsole();
    }
}

function switchAuthTab(tab) {
    document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
    event.target.classList.add("active");

    if (tab === "login") {
        document.getElementById("loginForm").classList.remove("hidden");
        document.getElementById("registerForm").classList.add("hidden");
    } else {
        document.getElementById("loginForm").classList.add("hidden");
        document.getElementById("registerForm").classList.remove("hidden");
    }
}

function toggleTechFields() {
    const role = document.getElementById("regRole").value;
    document.getElementById("techFields").classList.toggle("hidden", role !== "technician");
}

async function handleRegister(e) {
    e.preventDefault();
    const role = document.getElementById("regRole").value;
    const name = document.getElementById("regName").value.trim();
    const email = document.getElementById("regEmail").value.trim();

    const payload = {
        name,
        email,
        password: "password123",
        role,
        category: role === "technician" ? document.getElementById("regCategory").value : null,
        experience_years: role === "technician" ? parseInt(document.getElementById("regExp").value) : null,
        base_charge: role === "technician" ? parseInt(document.getElementById("regCharge").value) : null
    };

    try {
        const res = await fetch(`${API_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const err = await res.json();
            alert(err.detail || "Registration failed");
            return;
        }
        currentUser = await res.json();
        localStorage.setItem("fixmate_user", JSON.stringify(currentUser));
        renderApp();
    } catch (err) {
        alert("Server connection error!");
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById("loginIdentifier").value.trim();
    const role = document.getElementById("loginRole").value;

    try {
        const res = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password: "password123", role })
        });
        if (!res.ok) {
            alert("Invalid credentials or role!");
            return;
        }
        currentUser = await res.json();
        localStorage.setItem("fixmate_user", JSON.stringify(currentUser));
        renderApp();
    } catch (err) {
        alert("Server connection error!");
    }
}

async function quickDemoLogin(role) {
    if (role === "customer") {
        currentUser = { id: 1, name: "Shanthi", email: "shanthi@example.com", role: "customer" };
    } else {
        try {
            const res = await fetch(`${API_URL}/technicians?category=Plumbing`);
            const techs = await res.json();
            if (techs.length > 0) {
                currentUser = { id: techs[0].id, name: techs[0].name, email: techs[0].email, role: "technician", category: techs[0].category };
            } else {
                alert("Please register a technician first!");
                return;
            }
        } catch (err) {
            alert("Server connection error!");
            return;
        }
    }
    localStorage.setItem("fixmate_user", JSON.stringify(currentUser));
    renderApp();
}

function logout() {
    currentUser = null;
    localStorage.removeItem("fixmate_user");
    renderApp();
}

function renderCategories() {
    const grid = document.getElementById("categoryGrid");
    grid.innerHTML = CATEGORIES.map(cat => `
        <div class="cat-card ${cat.name === activeCategory ? 'active' : ''}" onclick="selectCategory('${cat.name}')">
            <div class="cat-icon">${cat.icon}</div>
            <div class="cat-title">${cat.name}</div>
        </div>
    `).join("");

    document.getElementById("reqService").value = activeCategory;
    document.getElementById("selectedCatLabel").textContent = activeCategory;
}

function selectCategory(catName) {
    activeCategory = catName;
    selectedTechnician = null;
    document.getElementById("reqTechName").value = "";
    renderCategories();
    fetchTechnicians(catName);
}

async function fetchTechnicians(catName) {
    try {
        const res = await fetch(`${API_URL}/technicians?category=${catName}`);
        techniciansCache = await res.json();
        renderTechniciansList();
    } catch (err) {
        console.error("Failed to load technicians");
    }
}

function renderTechniciansList() {
    const list = document.getElementById("technicianList");
    if (techniciansCache.length === 0) {
        list.innerHTML = `<p class="subtitle">No technicians available in this category yet.</p>`;
        return;
    }

    list.innerHTML = techniciansCache.map(tech => `
        <div class="tech-card ${selectedTechnician && selectedTechnician.id === tech.id ? 'selected' : ''}">
            <div>
                <div class="tech-header">
                    <strong>${tech.name}</strong>
                    <span>⭐ ${tech.rating?.toFixed(1) || 5.0} (${tech.reviews_count || 0})</span>
                </div>
                <p class="tech-meta">${tech.experience_years || 3} yrs experience • Est. Charge: <strong>₹${tech.base_charge || 299}</strong></p>
            </div>
            <button type="button" class="btn-outline" onclick="chooseTechnician(${tech.id})">
                ${selectedTechnician && selectedTechnician.id === tech.id ? '✓ Selected' : 'Select Technician'}
            </button>
        </div>
    `).join("");
}

function chooseTechnician(techId) {
    selectedTechnician = techniciansCache.find(t => t.id === techId);
    document.getElementById("reqTechName").value = `${selectedTechnician.name} (₹${selectedTechnician.base_charge})`;
    renderTechniciansList();
}

async function submitRepairRequest(e) {
    e.preventDefault();
    if (!selectedTechnician) {
        alert("Please select a technician first!");
        return;
    }

    const payload = {
        customer_id: currentUser.id,
        tech_id: selectedTechnician.id,
        service: activeCategory,
        problem: document.getElementById("reqProblem").value.trim(),
        address: document.getElementById("reqAddress").value.trim(),
        scheduled_time: document.getElementById("reqDateTime").value,
        charge: selectedTechnician.base_charge
    };

    try {
        const res = await fetch(`${API_URL}/bookings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            document.getElementById("repairForm").reset();
            document.getElementById("reqService").value = activeCategory;
            selectedTechnician = null;
            renderTechniciansList();
            loadCustomerBookings();
            alert("Booking request submitted successfully!");
        }
    } catch (err) {
        alert("Failed to submit booking.");
    }
}

async function loadCustomerBookings() {
    const container = document.getElementById("customerBookingsList");
    try {
        const res = await fetch(`${API_URL}/bookings/customer/${currentUser.id}`);
        const bookings = await res.json();

        if (bookings.length === 0) {
            container.innerHTML = `<p class="subtitle">No repair requests submitted yet.</p>`;
            return;
        }

        container.innerHTML = bookings.map(b => {
            let badgeClass = "badge-pending";
            if (b.status === "Accepted & On the Way") badgeClass = "badge-accepted";
            if (b.status === "Completed") badgeClass = "badge-completed";

            const isTracking = b.status === "Accepted & On the Way";

            return `
                <div class="booking-card">
                    <div class="booking-top">
                        <strong>${b.booking_code} • ${b.service}</strong>
                        <span class="badge ${badgeClass}">${b.status}</span>
                    </div>
                    <p style="font-size:13.5px;"><strong>Issue:</strong> ${b.problem}</p>
                    <p class="tech-meta">Charge: ₹${b.charge} | Slot: ${b.scheduled_time.replace("T", " ")}</p>
                    <p class="tech-meta">Address: ${b.address}</p>

                    ${isTracking ? `
                        <div class="tracking-banner">
                            <span>🛵 Technician is on the way!</span>
                            <span id="eta-${b.id}">ETA: 12 mins</span>
                        </div>
                        <div id="map-${b.id}" class="live-map-box"></div>
                    ` : ""}
                    
                    ${b.status === "Completed" && !b.rated ? `
                        <div style="margin-top:10px;">
                            <button class="btn-sm btn-rate" onclick="openRatingModal(${b.id})">⭐ Rate Technician</button>
                        </div>
                    ` : ""}

                    ${b.rated ? `
                        <p style="margin-top:8px;font-size:13px;color:var(--success);">
                            <strong>Your Rating:</strong> ${"⭐".repeat(b.rating_given)} — "${b.review_text}"
                        </p>
                    ` : ""}
                </div>
            `;
        }).join("");

        // Initialize maps for any active "On the Way" bookings
        bookings.forEach(b => {
            if (b.status === "Accepted & On the Way") {
                startLiveMapSimulation(b.id);
            }
        });

    } catch (err) {
        container.innerHTML = `<p class="subtitle">Error loading bookings.</p>`;
    }
}

function startLiveMapSimulation(bookingId) {
    const mapElement = document.getElementById(`map-${bookingId}`);
    if (!mapElement) return;

    // Customer location & Technician starting location
    const customerCoords = [17.3850, 78.4867];
    let techCoords = [17.3980, 78.4720];

    const map = L.map(`map-${bookingId}`).setView(customerCoords, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);

    // Custom markers
    const customerIcon = L.divIcon({ html: "🏠", className: "map-emoji", iconSize: [24, 24] });
    const techIcon = L.divIcon({ html: "🛵", className: "map-emoji", iconSize: [24, 24] });

    L.marker(customerCoords, { icon: customerIcon }).addTo(map).bindPopup("Your Location");
    const techMarker = L.marker(techCoords, { icon: techIcon }).addTo(map).bindPopup("Technician");

    // Draw route line
    const routeLine = L.polyline([techCoords, customerCoords], { color: '#2563eb', dashArray: '5, 10' }).addTo(map);

    // Move technician closer every 2 seconds
    let step = 0;
    const totalSteps = 20;
    const interval = setInterval(() => {
        step++;
        if (step >= totalSteps || !document.getElementById(`map-${bookingId}`)) {
            clearInterval(interval);
            const etaLabel = document.getElementById(`eta-${bookingId}`);
            if (etaLabel) etaLabel.textContent = "Arrived at location!";
            return;
        }

        const lat = techCoords[0] + (customerCoords[0] - techCoords[0]) * (step / totalSteps);
        const lng = techCoords[1] + (customerCoords[1] - techCoords[1]) * (step / totalSteps);

        techMarker.setLatLng([lat, lng]);
        routeLine.setLatLngs([[lat, lng], customerCoords]);

        const remainingMins = Math.max(1, Math.round(12 * (1 - step / totalSteps)));
        const etaLabel = document.getElementById(`eta-${bookingId}`);
        if (etaLabel) etaLabel.textContent = `ETA: ${remainingMins} mins`;
    }, 2000);
}