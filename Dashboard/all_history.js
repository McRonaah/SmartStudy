import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDNIl0ayYkFcawObJvXihDPEWzcEDc6Ebg",
    authDomain: "pdf-question-generator.firebaseapp.com",
    projectId: "pdf-question-generator",
    storageBucket: "pdf-question-generator.appspot.com",
    messagingSenderId: "98263805479",
    appId: "1:98263805479:web:54eb76212fb89888332802",
    measurementId: "G-70DDPT73G7"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// Function to Fetch and Display All History
async function fetchAllHistory() {
    try {
        console.log("Fetching all history...");

        const historyContainer = document.getElementById("all-history");
        historyContainer.innerHTML = ""; // Clear old data

        const querySnapshot = await getDocs(collection(db, "user_history"));

        if (querySnapshot.empty) {
            historyContainer.innerHTML = "<p>No history found.</p>";
            return;
        }

        let historyData = [];

        querySnapshot.forEach((doc) => {
            const historyItem = doc.data();
            if (!historyItem.date || !historyItem.date.seconds) {
                console.warn(`Skipping entry ${doc.id}, invalid date.`);
                return;
            }

            const itemDate = new Date(historyItem.date.seconds * 1000);
            historyData.push({ id: doc.id, file_name: historyItem.file_name, date: itemDate });
        });

        // Sort latest history first
        historyData.sort((a, b) => b.date - a.date);

        // Display history
        historyData.forEach((item) => {
            const entry = document.createElement("div");
            entry.className = "card";
            entry.innerHTML = `
                <img src="./assets/logo.png" alt="Logo" class="card-logo"> 
                <div class="card-content">
                    <p><strong>${item.file_name}</strong></p>
                    <small>${item.date.toLocaleString()}</small>
                </div>
            `;

            entry.addEventListener("click", () => {
                window.location.href = `quiz_summary.html?docId=${item.id}`;
            });

            historyContainer.appendChild(entry);
        });

        console.log("✅ All history loaded successfully.");
    } catch (error) {
        console.error("Error fetching history:", error);
    }
}

// Fetch history when the page loads
document.addEventListener("DOMContentLoaded", fetchAllHistory);
// Function to Fetch Search Suggestions
async function fetchSearchSuggestions(query) {
    try {
        const querySnapshot = await getDocs(collection(db, "user_history"));
        const suggestions = [];

        querySnapshot.forEach((doc) => {
            const historyItem = doc.data();
            if (historyItem.file_name.toLowerCase().includes(query.toLowerCase())) {
                suggestions.push({ id: doc.id, file_name: historyItem.file_name });
            }
        });

        return suggestions;
    } catch (error) {
        console.error("Error fetching search suggestions:", error);
        return [];
    }
}

// Function to Display Search Suggestions
function displaySuggestions(suggestions) {
    const suggestionsContainer = document.getElementById("search-suggestions");
    suggestionsContainer.innerHTML = "";

    suggestions.forEach((item) => {
        const suggestion = document.createElement("div");
        suggestion.className = "suggestion";
        suggestion.textContent = item.file_name;
        suggestion.addEventListener("click", () => {
            window.location.href = `quiz_summary.html?docId=${item.id}`;
        });
        suggestionsContainer.appendChild(suggestion);
    });
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("search");
    const suggestionsContainer = document.getElementById("search-suggestions");

    console.log("Search Input:", searchInput);
    console.log("Suggestions Container:", suggestionsContainer);

    if (!searchInput || !suggestionsContainer) {
        console.error("Search input or suggestions container not found!");
        return;
    }

    searchInput.addEventListener("input", async (e) => {
        const query = e.target.value.trim();
        if (query.length > 2) {
            const suggestions = await fetchSearchSuggestions(query);
            displaySuggestions(suggestions);
        } else {
            suggestionsContainer.innerHTML = "";
        }
    });

    fetchHistory();
});
