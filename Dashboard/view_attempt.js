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
const backToAttemptsLink = document.getElementById("back-to-attempts");
const summaryLink = document.getElementById("summary-link");
const attemptDateEl = document.getElementById("attempt-date");
const attemptTimeEl = document.getElementById("attempt-time");
const scorePercentageEl = document.getElementById("score-percentage");
const correctCountEl = document.getElementById("correct-count");
const incorrectCountEl = document.getElementById("incorrect-count");
const totalQuestionsEl = document.getElementById("total-questions");

// Get docId and attemptId from URL
function getQueryParams() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
        docId: urlParams.get("docId"),
        attemptId: urlParams.get("attemptId")
    };
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

// Extract correct answers from quiz text
function extractCorrectAnswers(quizText) {
    const correctAnswers = [];
    const matches = quizText.match(/\{([A-D])\}/g);
    
    if (matches) {
        matches.forEach(match => {
            correctAnswers.push(match.replace(/\{|\}/g, ""));
        });
    }
    
    return correctAnswers;
}

// Parse question text and choices
function parseQuestion(questionText) {
    const match = questionText.match(/^(.*?)(?:\s+[A-D]\)\s+.*)$/s);
    const qText = match ? match[1].trim() : questionText;
    const choicesText = questionText.replace(qText, "").trim();
    
    const choices = [];
    const choiceParts = choicesText.split(/([A-D]\)\s+)/).filter(c => c.trim() !== '');
    
    for (let i = 0; i < choiceParts.length; i += 2) {
        if (choiceParts[i + 1]) {
            choices.push({
                letter: choiceParts[i].trim().charAt(0),
                text: choiceParts[i + 1].trim()
            });
        }
    }
    
    return {
        text: qText,
        choices
    };
}

// Fetch and display attempt details
async function loadAttempt() {
    const { docId, attemptId } = getQueryParams();
    if (!docId || !attemptId) {
        showError("Missing attempt data. Please return to the attempts page.");
        return;
    }

    try {
        // Set up navigation links
        backToAttemptsLink.href = `attempts.html?docId=${docId}`;
        summaryLink.href = `quiz_summary.html?docId=${docId}`;

        // Fetch attempt data
        const attemptRef = db.collection("user_history").doc(docId).collection("attempts").doc(attemptId);
        const attemptSnap = await attemptRef.get();

        if (!attemptSnap.exists) {
            showError("No attempt found. It may have been deleted.");
            return;
        }

        const attemptData = attemptSnap.data();
        const userAnswers = attemptData.answers || [];

        // Update attempt metadata
        attemptDateEl.textContent = formatDate(attemptData.timestamp);
        attemptTimeEl.textContent = formatTime(attemptData.timeSpent || 0);

        // Fetch original quiz data
        const quizRef = db.collection("user_history").doc(docId);
        const quizSnap = await quizRef.get();

        if (!quizSnap.exists) {
            showError("Original quiz not found. It may have been deleted.");
            return;
        }

        const quizData = quizSnap.data();
        const quizContent = quizData.file_quiz;
        const correctAnswers = extractCorrectAnswers(quizContent);

        // Split questions and display
        const questionBlocks = quizContent.split(/\{[A-D]\}/).filter(q => q.trim() !== "");
        displayAttempt(questionBlocks, userAnswers, correctAnswers, attemptData.score);

    } catch (error) {
        console.error("Error loading attempt:", error);
        showError("Failed to load attempt details. Please try again.");
    }
}

// Display attempt details with user answers
function displayAttempt(questionBlocks, userAnswers, correctAnswers, overallScore) {
    const quizContainer = document.getElementById("quiz-attempt");
    quizContainer.innerHTML = "";

    let correctCount = 0;
    const totalQuestions = questionBlocks.length;

    questionBlocks.forEach((block, index) => {
        const { text: questionText, choices } = parseQuestion(block.trim());
        const userAnswer = userAnswers.find(a => a.questionIndex === index);
        const correctAnswer = correctAnswers[index];
        const isCorrect = userAnswer && userAnswer.answer === correctAnswer;

        if (isCorrect) correctCount++;

        // Create question element
        const questionDiv = document.createElement("div");
        questionDiv.className = "question";

        // Question text
        const questionTextEl = document.createElement("div");
        questionTextEl.className = "question-text";
        questionTextEl.textContent = `${index + 1}. ${questionText}`;
        questionDiv.appendChild(questionTextEl);

        // Choices container
        const choicesContainer = document.createElement("div");
        choicesContainer.className = "choices-container";

        choices.forEach(choice => {
            const choiceItem = document.createElement("div");
            choiceItem.className = "choice-item";
            
            // Highlight correct answers and user selections
            if (choice.letter === correctAnswer) {
                choiceItem.classList.add("correct");
            } else if (userAnswer && userAnswer.answer === choice.letter) {
                choiceItem.classList.add("incorrect", "user-selected");
            }

            // Add choice letter and text
            const choiceLetter = document.createElement("span");
            choiceLetter.className = "choice-letter";
            choiceLetter.textContent = choice.letter + ")";
            
            const choiceText = document.createElement("span");
            choiceText.textContent = choice.text;

            choiceItem.appendChild(choiceLetter);
            choiceItem.appendChild(choiceText);

            // Add feedback icon
            if (choice.letter === correctAnswer || 
                (userAnswer && userAnswer.answer === choice.letter)) {
                const feedbackIcon = document.createElement("i");
                feedbackIcon.className = `feedback-icon fas ${
                    choice.letter === correctAnswer ? "fa-check-circle correct" : "fa-times-circle incorrect"
                }`;
                choiceItem.appendChild(feedbackIcon);
            }

            choicesContainer.appendChild(choiceItem);
        });

        questionDiv.appendChild(choicesContainer);
        quizContainer.appendChild(questionDiv);
    });

    // Update performance metrics
    const incorrectCount = totalQuestions - correctCount;
    const percentage = Math.round((correctCount / totalQuestions) * 100);

    scorePercentageEl.textContent = `${overallScore || percentage}%`;
    correctCountEl.textContent = correctCount;
    incorrectCountEl.textContent = incorrectCount;
    totalQuestionsEl.textContent = totalQuestions;
}

// Show error message
function showError(message) {
    const quizContainer = document.getElementById("quiz-attempt");
    quizContainer.innerHTML = `
        <div class="error-state">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Error Loading Attempt</h3>
            <p>${message}</p>
            <a href="attempts.html" class="view-btn">
                <i class="fas fa-arrow-left"></i> Back to Attempts
            </a>
        </div>
    `;
}

// Initialize page
document.addEventListener("DOMContentLoaded", loadAttempt);