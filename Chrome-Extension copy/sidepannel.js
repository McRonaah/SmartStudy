chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "updateSidePanel") {
    console.log("Message received:", message);

    const quizContainer = document.getElementById("quiz-container");
    const summaryContainer = document.getElementById("summary-container");

    if (message.contentType === "quiz") {
      if (quizContainer) {
        quizContainer.innerHTML = '<h2>Generated Quiz</h2>';
        
        // Split questions by number
        const questions = message.content.split(/(?=\d+\.)/g);
        
        questions.forEach((q, index) => {
          if (!q.trim()) return;

          // Extract question parts
          const [fullText, correctAnswer] = q.split(/{([A-D])}\s*/);
          const [questionText, ...options] = fullText.split(/(?=[A-D]\.)/);
          
          // Create question element
          const questionDiv = document.createElement('div');
          questionDiv.className = 'question';
          const questionId = `question-${index}`;
          
          // Create question HTML with radio buttons
          questionDiv.innerHTML = `
          <div class="question-text">${questionText.trim()}</div>
          <div class="options-container">
            ${options.map((opt) => {
              const optionLetter = opt.trim().charAt(0); // Define here
              return `
                <label class="option-label">
                  <input type="radio" 
                         name="${questionId}" 
                         value="${optionLetter}" 
                         class="option-radio">
                  <span class="radio-custom"></span>
                  <span class="option-text">${opt.trim()}</span>
                </label>
              `;
            }).join('')}
          </div>
          <div class="feedback" style="display: none;">
            <span class="correct-answer">Correct answer: ${correctAnswer}</span>
          </div>
        `;

          // Add event listener for radio buttons
          questionDiv.querySelectorAll('.option-radio').forEach(radio => {
            radio.addEventListener('change', function() {
              if (this.checked) {
                const selectedValue = this.value;
                const options = this.closest('.options-container').querySelectorAll('.option-label');
                const feedback = this.closest('.question').querySelector('.feedback');
                
                // Remove previous styling
                options.forEach(opt => {
                  opt.classList.remove('correct', 'incorrect');
                });

                // Validate answer
                if (selectedValue === correctAnswer) {
                  this.parentElement.classList.add('correct');
                  feedback.innerHTML = '<span class="correct-feedback">✓ Correct!</span>';
                } else {
                  this.parentElement.classList.add('incorrect');
                  feedback.innerHTML = `
                    <span class="incorrect-feedback">✗ Incorrect. </span>
                    <span class="correct-answer">Correct answer: ${correctAnswer}</span>
                  `;
                }
                
                // Show feedback
                feedback.style.display = 'block';
                
                // Disable all radios after selection
                options.forEach(opt => {
                  opt.querySelector('.option-radio').disabled = true;
                });
              }
            });
          });

          quizContainer.appendChild(questionDiv);
        });
      }
    } else if (message.contentType === "summary") {
      if (summaryContainer) {
        summaryContainer.innerHTML = `
          <h2>Summary</h2>
          <div class="summary-content">${message.content}</div>
        `;
      }
    }
  }
});