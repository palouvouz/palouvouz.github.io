document.addEventListener("DOMContentLoaded", () => {
    console.log("Palouvouz portfolio loaded");

    // ==============================
    // Card hover effect
    // ==============================

    const cards = document.querySelectorAll(".card");

    cards.forEach(card => {
        card.addEventListener("mouseenter", () => {
            card.classList.add("card-hover");
        });

        card.addEventListener("mouseleave", () => {
            card.classList.remove("card-hover");
        });
    });


    // ==============================
    // Raspberry Pi Dashboard
    // ==============================

    const API_URL = "http://100.69.40.3:8080/api";

    async function updateDashboard() {
        console.log("Updating Raspberry Pi dashboard...");

        try {
            const response = await fetch(API_URL, {
                method: "GET",
                cache: "no-store"
            });

            console.log("API response:", response.status);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            console.log("API data:", data);

            // System information
            document.getElementById("ip").textContent = data.ip;
            document.getElementById("uptime").textContent = data.uptime;
            document.getElementById("cpu_usage").textContent = data.cpu_usage;
            document.getElementById("cpu_temp").textContent = data.cpu_temp;
            document.getElementById("ram").textContent = data.ram;
            document.getElementById("disk").textContent = data.disk;

            // Connection status
            const connection = document.getElementById("connection");
            if (connection) {
                connection.textContent = "Online";
            }

            // API status
            const apiStatus = document.getElementById("apiStatus");
            if (apiStatus) {
                apiStatus.textContent = "API connection active";
            }

            // Last update
            const lastUpdate = document.getElementById("lastUpdate");
            if (lastUpdate) {
                lastUpdate.textContent =
                    new Date().toLocaleTimeString("el-GR");
            }

        } catch (error) {

            console.error("PalouvouzRPi5 API error:", error);

            const connection = document.getElementById("connection");
            if (connection) {
                connection.textContent = "Offline";
            }

            const apiStatus = document.getElementById("apiStatus");
            if (apiStatus) {
                apiStatus.textContent =
                    "Unable to connect to the Raspberry Pi API.";
            }
        }
    }

    // First update immediately
    updateDashboard();

    // Update every 2 seconds
    setInterval(updateDashboard, 2000);
});