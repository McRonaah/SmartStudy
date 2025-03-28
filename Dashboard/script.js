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

// Function to Fetch and Categorize History
async function fetchHistory() {
    try {
        console.log("Fetching history...");

        const todayContainer = document.getElementById("today-history").querySelector(".history-list");
        const weekContainer = document.getElementById("week-history").querySelector(".history-list");
        const monthContainer = document.getElementById("month-history").querySelector(".history-list");

        if (!todayContainer || !weekContainer || !monthContainer) {
            console.error("One or more UI containers are missing.");
            return;
        }

        todayContainer.innerHTML = "";
        weekContainer.innerHTML = "";
        monthContainer.innerHTML = "";

        const querySnapshot = await getDocs(collection(db, "user_history"));

        if (querySnapshot.empty) {
            console.warn("No history data found.");
            todayContainer.innerHTML = "<p>No history for today.</p>";
            weekContainer.innerHTML = "<p>No history for this week.</p>";
            monthContainer.innerHTML = "<p>No history for this month.</p>";
            return;
        }

        console.log(`Fetched ${querySnapshot.size} records from Firestore`);

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(startOfToday);
        startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        let historyData = [];

        querySnapshot.forEach((doc) => {
            const historyItem = doc.data();
            if (!historyItem.date || !historyItem.date.seconds) {
                console.warn(`Skipping entry ${doc.id}, missing or invalid timestamp.`);
                return;
            }

            const itemDate = new Date(historyItem.date.seconds * 1000);
            console.log(`Processing: ${historyItem.file_name} - Date: ${itemDate}`);

            historyData.push({ id: doc.id, file_name: historyItem.file_name, date: itemDate });
        });

        historyData.sort((a, b) => b.date - a.date);

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

            if (item.date >= startOfToday) {
                todayContainer.appendChild(entry);
                weekContainer.appendChild(entry.cloneNode(true));
                monthContainer.appendChild(entry.cloneNode(true));
                console.log("✅ Added to Today, This Week, and This Month");
            } else if (item.date >= startOfWeek) {
                weekContainer.appendChild(entry);
                monthContainer.appendChild(entry.cloneNode(true));
                console.log("✅ Added to This Week and This Month");
            } else if (item.date >= startOfMonth) {
                monthContainer.appendChild(entry);
                console.log("✅ Added to This Month");
            }
        });
        document.getElementById("all-history-btn").addEventListener("click", () => {
            window.location.href = "all_history.html";
        });
        
        // Ensure "No history" messages are displayed if a category is empty
        if (todayContainer.children.length === 0) {
            todayContainer.innerHTML = "<p>No history for today.</p>";
        }
        if (weekContainer.children.length === 0) {
            weekContainer.innerHTML = "<p>No history for this week.</p>";
        }
        if (monthContainer.children.length === 0) {
            monthContainer.innerHTML = "<p>No history for this month.</p>";
        }
    } catch (error) {
        console.error("Error fetching history:", error);
    }
}

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
