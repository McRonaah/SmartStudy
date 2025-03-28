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
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// DOM Elements
const backToQuizLink = document.getElementById("back-to-quiz");
const summaryLink = document.getElementById("summary-link");
const searchInput = document.getElementById("search-attempts");
const sortSelect = document.getElementById("sort-attempts");
const totalTimeEl = document.getElementById("total-time");
const bestScoreEl = document.getElementById("best-score");
const attemptCountEl = document.getElementById("attempt-count");

// Get docId from URL
function getDocIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("docId");
}

// Format time from seconds to MM:SS
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
}

// Format date to readable string
function formatDate(timestamp) {
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
    };
    return new Date(timestamp.toDate()).toLocaleDateString('en-US', options);
}

// Load and display attempts with statistics
async function loadAttempts() {
    const docId = getDocIdFromURL();
    if (!docId) {
        showError("No document selected. Please return to the quiz.");
        return;
    }

    try {
        const attemptsRef = db.collection("user_history").doc(docId)
                            .collection("attempts");
        
        const snapshot = await attemptsRef.get();
        const attemptsList = document.getElementById("attempts-list");
        
        if (snapshot.empty) {
            attemptsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <h3>No Attempts Found</h3>
                    <p>You haven't attempted this quiz yet.</p>
                </div>
            `;
            return;
        }

        // Process all attempts
        let attempts = [];
        let totalTime = 0;
        let bestScore = 0;
        
        snapshot.forEach(doc => {
            const attempt = doc.data();
            attempt.id = doc.id;
            attempts.push(attempt);
            
            // Calculate statistics
            totalTime += attempt.timeSpent || 0;
            if (attempt.score > bestScore) {
                bestScore = attempt.score;
            }
        });

        // Update statistics
        attemptCountEl.textContent = attempts.length;
        bestScoreEl.textContent = `${bestScore}%`;
        totalTimeEl.textContent = formatTime(totalTime);

        // Sort attempts based on selection
        sortAttempts(attempts);

        // Display attempts
        displayAttempts(attempts);

        // Set up event listeners for search and sort
        searchInput.addEventListener('input', () => filterAttempts(attempts));
        sortSelect.addEventListener('change', () => {
            sortAttempts(attempts);
            displayAttempts(attempts);
        });

    } catch (error) {
        console.error("Error loading attempts:", error);
        showError("Failed to load attempts. Please try again.");
    }
}

// Sort attempts based on selected option
function sortAttempts(attempts) {
    const sortBy = sortSelect.value;
    
    switch(sortBy) {
        case 'newest':
            attempts.sort((a, b) => b.timestamp - a.timestamp);
            break;
        case 'oldest':
            attempts.sort((a, b) => a.timestamp - b.timestamp);
            break;
        case 'highest':
            attempts.sort((a, b) => b.score - a.score);
            break;
        case 'lowest':
            attempts.sort((a, b) => a.score - b.score);
            break;
    }
}

// Filter attempts based on search input
function filterAttempts(attempts) {
    const searchTerm = searchInput.value.toLowerCase();
    const filtered = attempts.filter(attempt => {
        return (
            attempt.id.toLowerCase().includes(searchTerm) ||
            formatDate(attempt.timestamp).toLowerCase().includes(searchTerm) ||
            attempt.score.toString().includes(searchTerm)
        );
    });
    displayAttempts(filtered);
}

// Display attempts in the UI
function displayAttempts(attempts) {
    const attemptsList = document.getElementById("attempts-list");
    
    if (attempts.length === 0) {
        attemptsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>No Matching Attempts</h3>
                <p>Try adjusting your search criteria.</p>
            </div>
        `;
        return;
    }

    let attemptsHTML = '';
    
    attempts.forEach((attempt, index) => {
        const scoreClass = attempt.score >= 70 ? 'high-score' : 'low-score';
        
        attemptsHTML += `
            <div class="attempt-card ${scoreClass}">
                <div class="attempt-header">
                    <h3>Attempt #${index + 1}</h3>
                    <span class="attempt-date">${formatDate(attempt.timestamp)}</span>
                </div>
                <div class="attempt-details">
                    <div class="detail-item">
                        <span class="detail-label">Score</span>
                        <span class="detail-value">${attempt.score}%</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Time Spent</span>
                        <span class="detail-value">${formatTime(attempt.timeSpent)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Questions</span>
                        <span class="detail-value">${attempt.totalQuestions || '--'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Status</span>
                        <span class="detail-value">${attempt.status === 'completed' ? 'Completed' : 'In Progress'}</span>
                    </div>
                </div>
                <a href="view_attempt.html?docId=${getDocIdFromURL()}&attemptId=${attempt.id}" class="view-btn">
                    <i class="fas fa-eye"></i> View Details
                </a>
            </div>
        `;
    });

    attemptsList.innerHTML = attemptsHTML;
}

// Show error message
function showError(message) {
    const attemptsList = document.getElementById("attempts-list");
    attemptsList.innerHTML = `
        <div class="error-state">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Error Loading Attempts</h3>
            <p>${message}</p>
            <button id="go-back-btn" class="view-btn">
                <i class="fas fa-arrow-left"></i> Go Back
            </button>
        </div>
    `;
    document.getElementById("go-back-btn").addEventListener("click", goBackToQuiz);
}

// Navigate back to the quiz page with the document ID
function goBackToQuiz() {
    const docId = getDocIdFromURL();
    if (docId) {
        window.location.href = `quiz.html?docId=${docId}`;
    } else {
        window.history.back();
    }
}

// Navigate to summary page with document ID
function goToSummary(e) {
    e.preventDefault();
    const docId = getDocIdFromURL();
    if (docId) {
        window.location.href = `quiz_summary.html?docId=${docId}`;
    } else {
        alert("Cannot view summary - no document selected");
    }
}

// Initialize page
document.addEventListener("DOMContentLoaded", () => {
    // Set up navigation links
    const docId = getDocIdFromURL();
    
    if (docId) {
        backToQuizLink.href = `quiz.html?docId=${docId}`;
        summaryLink.href = `quiz_summary.html?docId=${docId}`;
    }
    
    summaryLink.addEventListener("click", goToSummary);
    
    // Load attempts
    loadAttempts();
});