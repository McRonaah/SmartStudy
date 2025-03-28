// Firebase Initialization
const firebaseConfig = {
    apiKey: "AIzaSyDNIl0ayYkFcawObJvXihDPEWzcEDc6Ebg",
    authDomain: "pdf-question-generator.firebaseapp.com",
    projectId: "pdf-question-generator",
    storageBucket: "pdf-question-generator.appspot.com",
    messagingSenderId: "98263805479",
    appId: "1:98263805479:web:54eb76212fb89888332802",
    measurementId: "G-70DDPT73G7"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// DOM Elements
const quizTitle = document.getElementById('quiz-title');
const quizQuestionsContainer = document.getElementById('quiz-questions');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const quizTimer = document.getElementById('quiz-timer');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const submitBtn = document.getElementById('submit-btn');
const feedbackModal = document.getElementById('feedback-modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const closeModal = document.querySelector('.close-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const attemptsLink = document.getElementById("attempts-link");
const summaryLink = document.getElementById("summary-link");
const dashboardLink = document.querySelector('a[href="dashboard.html"]');

// Quiz State
let currentQuestion = 0;
let questions = [];
let userAnswers = {};
let quizData = {};
let timerInterval;
let secondsElapsed = 0;
let quizSubmitted = false;

// Format time as MM:SS
const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
};

// Start quiz timer
const startTimer = () => {
    timerInterval = setInterval(() => {
        secondsElapsed++;
        quizTimer.textContent = formatTime(secondsElapsed);
    }, 1000);
};

// Stop quiz timer
const stopTimer = () => {
    clearInterval(timerInterval);
};

// Update progress bar
const updateProgress = () => {
    const progress = ((currentQuestion + 1) / questions.length) * 100;
    progressFill.style.width = `${progress}%`;
    progressText.textContent = `${currentQuestion + 1}/${questions.length} questions`;
};

// Parse quiz content matching the old behavior
const parseQuizContent = (quizText) => {
    // First find all correct answer markers and their positions
    const markerRegex = /\{[A-D]\}/g;
    const markers = [];
    let match;
    
    while ((match = markerRegex.exec(quizText)) !== null) {
        markers.push({
            position: match.index,
            answer: match[0].charAt(1) // Extract A, B, C, D
        });
    }
    
    // Split the text into questions
    const questions = [];
    let lastPos = 0;
    
    markers.forEach((marker, index) => {
        const questionEnd = marker.position;
        const questionText = quizText.slice(lastPos, questionEnd).trim();
        lastPos = marker.position + 3; // Skip past the marker {A}
        
        // Only process if we have question text
        if (questionText) {
            // Extract question and choices
            const match = questionText.match(/^(.*?)(?:\s+[A-D]\)\s+.*)$/s);
            const qText = match ? match[1].trim() : questionText;
            const choicesText = questionText.replace(qText, "").trim();
            
            // Process choices
            const choices = [];
            const choiceParts = choicesText.split(/([A-D]\)\s+)/).filter(c => c.trim() !== '');
            
            for (let i = 0; i < choiceParts.length; i += 2) {
                if (choiceParts[i + 1]) {
                    choices.push({
                        value: choiceParts[i].trim().charAt(0),
                        text: choiceParts[i + 1].trim()
                    });
                }
            }
            
            questions.push({
                text: qText,
                choices,
                correctAnswer: marker.answer
            });
        }
    });
    
    // Handle any remaining text after last marker
    if (lastPos < quizText.length) {
        const remainingText = quizText.slice(lastPos).trim();
        if (remainingText) {
            const match = remainingText.match(/^(.*?)(?:\s+[A-D]\)\s+.*)$/s);
            const qText = match ? match[1].trim() : remainingText;
            const choicesText = remainingText.replace(qText, "").trim();
            
            const choices = [];
            const choiceParts = choicesText.split(/([A-D]\)\s+)/).filter(c => c.trim() !== '');
            
            for (let i = 0; i < choiceParts.length; i += 2) {
                if (choiceParts[i + 1]) {
                    choices.push({
                        value: choiceParts[i].trim().charAt(0),
                        text: choiceParts[i + 1].trim()
                    });
                }
            }
            
            if (choices.length > 0) {
                questions.push({
                    text: qText,
                    choices,
                    correctAnswer: 'A' // Default if no marker found
                });
            }
        }
    }
    
    return questions;
};

// Create question element with radio buttons
const createQuestionElement = (questionData, index) => {
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question';
    questionDiv.dataset.index = index;
    
    questionDiv.innerHTML = `
        <div class="question-text">${index + 1}. ${questionData.text}</div>
        <div class="choices-container">
            ${questionData.choices.map(choice => `
                <label class="choice-label">
                    <input type="radio" 
                           name="question_${index}" 
                           value="${choice.value}"
                           class="choice-input"
                           ${userAnswers[index] === choice.value ? 'checked' : ''}>
                    <span class="choice-text">${choice.value}) ${choice.text}</span>
                </label>
            `).join('')}
        </div>
    `;
    
    return questionDiv;
};

// Show current question
const showQuestion = (index) => {
    document.querySelectorAll('.question').forEach(q => {
        q.classList.remove('active');
    });
    
    questions[index].element.classList.add('active');
    
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === questions.length - 1;
    submitBtn.style.display = index === questions.length - 1 ? 'block' : 'none';
    
    updateProgress();
};

// Save current answer
const saveAnswer = () => {
    const currentQuestionEl = questions[currentQuestion].element;
    const selectedOption = currentQuestionEl.querySelector('input[type="radio"]:checked');
    
    if (selectedOption) {
        userAnswers[currentQuestion] = selectedOption.value;
    }
};

// Check if there are unsaved answers
const hasUnsavedAnswers = () => {
    return Object.keys(userAnswers).length > 0 && !quizSubmitted;
};

// Save progress without submitting
const saveProgress = async () => {
    saveAnswer();
    const docId = getDocIdFromURL();
    if (!docId) return;

    try {
        await db.collection("user_history").doc(docId).collection("attempts").add({
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            answers: Object.entries(userAnswers).map(([index, answer]) => ({
                questionIndex: parseInt(index),
                answer
            })),
            timeSpent: secondsElapsed,
            status: "in_progress"
        });
        alert("Your progress has been saved!");
    } catch (error) {
        console.error("Error saving progress:", error);
        alert("Error saving progress. Please try again.");
    }
};

// Submit quiz
const submitQuiz = async () => {
    saveAnswer();
    stopTimer();
    
    const docId = getDocIdFromURL();
    if (!docId) return;
    
    try {
        // Calculate score
        const correctCount = questions.reduce((count, question, index) => {
            return count + (userAnswers[index] === question.correctAnswer ? 1 : 0);
        }, 0);
        
        const scorePercentage = Math.round((correctCount / questions.length) * 100);
        
        await db.collection("user_history").doc(docId).collection("attempts").add({
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            answers: Object.entries(userAnswers).map(([index, answer]) => ({
                questionIndex: parseInt(index),
                answer,
                isCorrect: answer === questions[index].correctAnswer
            })),
            timeSpent: secondsElapsed,
            totalQuestions: questions.length,
            score: scorePercentage,
            status: "completed"
        });
        
        quizSubmitted = true;
        showResults(correctCount, scorePercentage);
    } catch (error) {
        console.error("Error submitting quiz:", error);
        alert("Error submitting quiz. Please try again.");
    }
};

// Show quiz results
const showResults = (correctCount, scorePercentage) => {
    modalTitle.textContent = "Quiz Results";
    
    modalBody.innerHTML = `
        <div class="result-summary">
            <div class="result-item">
                <span>Questions Answered:</span>
                <strong>${Object.keys(userAnswers).length}/${questions.length}</strong>
            </div>
            <div class="result-item">
                <span>Correct Answers:</span>
                <strong>${correctCount}</strong>
            </div>
            <div class="result-item">
                <span>Your Score:</span>
                <strong>${scorePercentage}%</strong>
            </div>
            <div class="result-item">
                <span>Time Spent:</span>
                <strong>${formatTime(secondsElapsed)}</strong>
            </div>
        </div>
        <div class="feedback-message">
            ${scorePercentage >= 70 ? 
                '<p class="success"><i class="fas fa-check-circle"></i> Great job! You passed!</p>' :
                '<p class="warning"><i class="fas fa-exclamation-triangle"></i> Keep practicing to improve your score!</p>'
            }
        </div>
    `;
    
    feedbackModal.style.display = 'flex';
};

// Get document ID from URL
const getDocIdFromURL = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("docId");
};

// Setup navigation links with document ID
function setupNavigationLinks() {
    const docId = getDocIdFromURL();
    
    attemptsLink.addEventListener("click", (e) => {
        if (hasUnsavedAnswers()) {
            if (!confirm('You have unsaved answers. Are you sure you want to leave?')) {
                e.preventDefault();
                return;
            }
        }
        e.preventDefault();
        if (docId) {
            window.location.href = `attempts.html?docId=${docId}`;
        } else {
            alert("No document selected");
        }
    });
    
    summaryLink.addEventListener("click", (e) => {
        if (hasUnsavedAnswers()) {
            if (!confirm('You have unsaved answers. Are you sure you want to leave?')) {
                e.preventDefault();
                return;
            }
        }
        e.preventDefault();
        if (docId) {
            window.location.href = `quiz_summary.html?docId=${docId}`;
        } else {
            alert("No document selected");
        }
    });
    
    // Dashboard link doesn't need docId
    dashboardLink.addEventListener("click", (e) => {
        if (hasUnsavedAnswers()) {
            if (!confirm('You have unsaved answers. Are you sure you want to leave?')) {
                e.preventDefault();
            }
        }
    });
}

// Setup page leave confirmation
function setupPageLeaveConfirmation() {
    window.addEventListener('beforeunload', (e) => {
        if (hasUnsavedAnswers()) {
            e.preventDefault();
            return e.returnValue = 'You have unsaved answers. Are you sure you want to leave?';
        }
    });
}

// Initialize quiz
const initQuiz = async () => {
    // Create and add Save Progress button
    const saveProgressBtn = document.createElement('button');
    saveProgressBtn.id = 'save-progress-btn';
    saveProgressBtn.className = 'quiz-btn save';
    saveProgressBtn.innerHTML = '<i class="fas fa-save"></i> Save Progress';
    document.querySelector('.quiz-controls').prepend(saveProgressBtn);
    
    saveProgressBtn.addEventListener('click', saveProgress);
    
    setupNavigationLinks();
    setupPageLeaveConfirmation();
    
    const docId = getDocIdFromURL();
    if (!docId) {
        quizQuestionsContainer.innerHTML = '<p class="error">Error: No document selected.</p>';
        return;
    }
    
    try {
        const docRef = db.collection("user_history").doc(docId);
        const docSnap = await docRef.get();
        
        if (!docSnap.exists) {
            quizQuestionsContainer.innerHTML = '<p class="error">Error: Document not found.</p>';
            return;
        }
        
        const data = docSnap.data();
        quizTitle.textContent = data.file_name || "Document Quiz";
        
        if (!data.file_quiz) {
            quizQuestionsContainer.innerHTML = '<p class="error">No quiz available for this document.</p>';
            return;
        }
        
        // Parse quiz content using the updated parser
        const parsedQuestions = parseQuizContent(data.file_quiz);
        questions = parsedQuestions.map((q, i) => ({
            ...q,
            element: createQuestionElement(q, i)
        }));
        
        // Add questions to DOM
        questions.forEach(q => {
            quizQuestionsContainer.appendChild(q.element);
        });
        
        // Initialize user answers
        userAnswers = {};
        
        // Start quiz
        showQuestion(0);
        startTimer();
        
    } catch (error) {
        console.error("Error initializing quiz:", error);
        quizQuestionsContainer.innerHTML = '<p class="error">Error loading quiz. Please try again.</p>';
    }
};

// Event Listeners
prevBtn.addEventListener('click', () => {
    saveAnswer();
    currentQuestion--;
    showQuestion(currentQuestion);
});

nextBtn.addEventListener('click', () => {
    saveAnswer();
    currentQuestion++;
    showQuestion(currentQuestion);
});

submitBtn.addEventListener('click', submitQuiz);

closeModal.addEventListener('click', () => {
    feedbackModal.style.display = 'none';
});

modalCloseBtn.addEventListener('click', () => {
    feedbackModal.style.display = 'none';
    window.location.href = `quiz_summary.html?docId=${getDocIdFromURL()}`;
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initQuiz);