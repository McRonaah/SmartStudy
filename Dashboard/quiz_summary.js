import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

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
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM Elements
const fileNameElement = document.getElementById('file-name');
const uploadDateElement = document.getElementById('upload-date');
const questionCountElement = document.getElementById('question-count');
const summaryTextElement = document.getElementById('summary-text');
const quizQuestionsElement = document.getElementById('quiz-questions');
const quizProgressElement = document.getElementById('quiz-progress');
const startQuizButton = document.getElementById('start-quiz');

// Format date
const formatDate = (timestamp) => {
    if (!timestamp) return 'Date not available';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// Enhanced summary rendering with formatting
const renderSummaryContent = (summary) => {
    if (!summary) {
        return '<div class="empty-state"><i class="fas fa-info-circle"></i> No summary available for this document</div>';
    }

    // Process headings (lines that end with a colon)
    let processedContent = summary.replace(/^(.*:)\s*$/gm, '<h3>$1</h3>');
    
    // Process numbered lists (lines starting with 1., 2., etc.)
    processedContent = processedContent.replace(/^(\d+\.\s+)(.*)$/gm, '<li>$2</li>');
    processedContent = processedContent.replace(/(<li>.*<\/li>)+/g, (match) => {
        return `<ol>${match}</ol>`;
    });
    
    // Process bullet points (lines starting with -, •, or *)
    processedContent = processedContent.replace(/^([-•*]\s+)(.*)$/gm, '<li>$2</li>');
    processedContent = processedContent.replace(/(<li>.*<\/li>)+/g, (match) => {
        return `<ul>${match}</ul>`;
    });
    
    // Process paragraphs (double line breaks)
    processedContent = processedContent.replace(/\n\n+/g, '</p><p>');
    processedContent = processedContent.replace(/^(?!<[ou]l>|<li>|<h3>)(.*)$/gm, '<p>$1</p>');
    
    // Clean up any empty paragraphs
    processedContent = processedContent.replace(/<p><\/p>/g, '');
    
    return processedContent;
};

// Parse and render quiz info
const renderQuizInfo = (quizData) => {
    if (!quizData) {
        return '<div class="empty-state"><i class="fas fa-info-circle"></i> No quiz available for this document</div>';
    }

    try {
        const quiz = JSON.parse(quizData);
        const questionCount = quiz.questions ? quiz.questions.length : 0;
        
        quizProgressElement.textContent = `${questionCount} questions available`;
        
        return `
            <div class="quiz-info">
                <div class="quiz-stats">
                    <div class="stat-item"><i class="fas fa-list-ol"></i> ${questionCount} Questions</div>
                    <div class="stat-item"><i class="fas fa-layer-group"></i> Multiple Topics</div>
                </div>
                <p class="quiz-description">Test your knowledge based on the document content.</p>
            </div>
        `;
    } catch (e) {
        console.error('Error parsing quiz data:', e);
        return '<div class="error-state"><i class="fas fa-exclamation-triangle"></i> Error loading quiz data</div>';
    }
};

// Download as PDF
const downloadAsPDF = (filename, content) => {
    if (!content) {
        alert("No summary content available to download.");
        return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // First render to HTML to get properly formatted text
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = renderSummaryContent(content);
        const plainText = tempDiv.textContent || tempDiv.innerText;
        
        const lines = doc.splitTextToSize(plainText, 180);
        doc.text(lines, 10, 10);
        doc.save(`${filename}_summary.pdf`);
    };
    document.body.appendChild(script);
};

// Download as TXT
const downloadAsTXT = (filename, content) => {
    if (!content) {
        alert("No summary content available to download.");
        return;
    }
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_summary.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// Fetch and display document data
const fetchAndDisplayContent = async () => {
    const docId = getDocIdFromURL();
    if (!docId) {
        showError("No document ID found in URL.");
        return;
    }

    try {
        const docRef = doc(db, "user_history", docId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            showError("Document not found in database.");
            return;
        }

        const data = docSnap.data();
        
        // Update document info
        fileNameElement.textContent = data.file_name || "Untitled Document";
        fileNameElement.innerHTML = `<i class="fas fa-file-alt"></i> ${fileNameElement.textContent}`;
        
        if (data.date) {
            uploadDateElement.textContent = formatDate(data.date);
        }
        
        if (data.file_quiz) { 
            try {
                const quiz = JSON.parse(data.file_quiz);
                questionCountElement.textContent = quiz.questions ? quiz.questions.length : 0;
            } catch (e) {
                questionCountElement.textContent = "N/A";
            }
        }

        // Render summary content
        summaryTextElement.innerHTML = renderSummaryContent(data.file_summary);
        
        // Render quiz info
        quizQuestionsElement.innerHTML = renderQuizInfo(data.file_quiz);

        // Set up download buttons
        const downloadPDFButton = document.getElementById('download-pdf');
        const downloadTXTButton = document.getElementById('download-txt');
        
        if (downloadPDFButton && downloadTXTButton) {
            downloadPDFButton.addEventListener('click', () => {
                downloadAsPDF(data.file_name || "document", data.file_summary);
            });
            
            downloadTXTButton.addEventListener('click', () => {
                downloadAsTXT(data.file_name || "document", data.file_summary);
            });
        }

    } catch (error) {
        console.error("Error fetching document:", error);
        showError("Error loading document data. Please try again.");
    }
};

// Helper functions
function getDocIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("docId");
}

function showError(message) {
    summaryTextElement.innerHTML = `
        <div class="error-state">
            <i class="fas fa-exclamation-triangle"></i>
            <p>${message}</p>
        </div>
    `;
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    fetchAndDisplayContent();
    
    if (startQuizButton) {
        startQuizButton.addEventListener('click', () => {
            const docId = getDocIdFromURL();
            if (docId) {
                window.location.href = `quiz.html?docId=${docId}`;
            }
        });
    }
});