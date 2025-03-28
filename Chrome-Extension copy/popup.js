   // Supabase Configuration
   const SUPABASE_URL = "https://omcrqzojzbbsyznpriyf.supabase.co";
   const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tY3Jxem9qemJic3l6bnByaXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyODYxNzYsImV4cCI6MjA1Njg2MjE3Nn0.L7IQ0AZ1hg4SxZIwcz6lFw7qQbDlW-FkWlAKV0ZTi2I";
   // Initialize Supabase only after the DOM loads
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log("Supabase initialized:", supabase);
document.addEventListener("DOMContentLoaded", () => {

  
  let currentWindowId = null;
  let extractedText = "";

  chrome.windows.getCurrent((w) => {
    currentWindowId = w.id;
    console.log("Current window ID stored:", currentWindowId);
  });

  // Get all buttons and input elements
  const quizButton = document.getElementById("quiz");
  const summaryButton = document.getElementById("summary");
  const fileInput = document.getElementById("file");
  const getQuizButton = document.getElementById("get-quiz");
  const getSummaryButton = document.getElementById("get-summary");
  const buttonContainer = document.getElementById("button-container");

  
  const loginButton = document.getElementById("login-btn");
  const logoutButton = document.getElementById("logout-btn");
  const userInfo = document.getElementById("user-info");
  const userName = document.getElementById("user-name");
  const userPic = document.getElementById("user-pic");





  /** ========= SUPABASE AUTH ========= **/
  async function checkAuthState() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      updateUI(user);
      checkUserProfile(user);
    }
  }

  async function signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `https://${chrome.runtime.id}.chromiumapp.org/redirect`,
        queryParams: {
          prompt: 'select_account',
          access_type: 'offline'
        }
      }
    });

    if (error) {
      console.error('Login error:', error);
      return;
    }

    chrome.identity.launchWebAuthFlow({
      url: data.url,
      interactive: true
    }, async (responseUrl) => {
      if (chrome.runtime.lastError || !responseUrl) {
        console.error('Authentication failed:', chrome.runtime.lastError);
        return;
      }

      const hashParams = new URL(responseUrl).hash.substring(1);
      const params = new URLSearchParams(hashParams);
      
      await supabase.auth.setSession({
        access_token: params.get('access_token'),
        refresh_token: params.get('refresh_token')
      });

      const { data: { user } } = await supabase.auth.getUser();
      updateUI(user);
      checkUserProfile(user);
    });
  }

  async function checkUserProfile(user) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!data || error) {
      createUserProfile(user);
    }
  }

  async function createUserProfile(user) {
    const nameParts = user.user_metadata.full_name?.split(' ') || [];
    const { error } = await supabase
      .from('user_profiles')
      .insert([{
        user_id: user.id,
        email: user.email,
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || '',
        avatar_url: user.user_metadata.avatar_url
      }]);

    if (error) console.error('Profile creation error:', error);
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      chrome.storage.local.remove('supabase_session');
      loginButton.style.display = "block";
      userInfo.style.display = "none";
    }
  }

  function updateUI(user) {
    loginButton.style.display = "none";
    userInfo.style.display = "flex";
    userName.textContent = user.user_metadata.full_name || user.email;
    userPic.src = user.user_metadata.avatar_url || '';
  }

  // Initialize auth state
  checkAuthState();
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      loginButton.style.display = "block";
      userInfo.style.display = "none";
    }
  });

  // Event listeners
  loginButton.addEventListener("click", signInWithGoogle);
  logoutButton.addEventListener("click", signOut);





  

  // Hide file-upload-related buttons initially
  buttonContainer.style.display = "none";

  /** ========= Extract Text from an Open PDF Tab ========= **/
  function extractFromOpenTab(actionType) {
    chrome.sidePanel.open({ windowId: currentWindowId });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        console.error("No active tab found.");
        return;
      }
      const activeTab = tabs[0];

      console.log("Active tab URL:", activeTab.url);
      if (activeTab.url && activeTab.url.toLowerCase().endsWith(".pdf")) {
        fetch(activeTab.url)
          .then(response => {
            if (!response.ok) throw new Error("Network response was not ok");
            return response.arrayBuffer();
          })
          .then(data => {
            extractTextFromPDF(new Uint8Array(data), actionType);
          })
          .catch(err => {
            console.error("Error fetching PDF file:", err);
          });
      } else {
        alert("Active tab is not a PDF file.");
      }
    });
  }

  quizButton.addEventListener("click", () => extractFromOpenTab("quiz"));
  summaryButton.addEventListener("click", () => extractFromOpenTab("summary"));

  /** ========= Extract Text from a Selected File ========= **/
  fileInput.addEventListener("change", (event) => {
    const file = event.target.files[0];

    if (!file) {
      console.error("No file selected.");
      return;
    }

    if (file.type !== "application/pdf") {
      alert("Please select a PDF file.");
      return;
    }

    // Show buttons for file manipulation
    buttonContainer.style.display = "flex";

    // Read and extract text from the selected PDF
    const reader = new FileReader();
    reader.onload = function (e) {
      const pdfData = new Uint8Array(e.target.result);
      extractTextFromPDF(pdfData, null); // No action type yet
    };
    reader.readAsArrayBuffer(file);
  });

  async function extractTextFromPDF(pdfData, actionType) {
    try {
      const loadingTask = window.pdfjsLib.getDocument({ data: pdfData });
      const pdfDocument = await loadingTask.promise;
      extractedText = "";

      for (let i = 1; i <= pdfDocument.numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        textContent.items.forEach(item => {
          extractedText += item.str + " ";
        });
      }

      console.log("Extracted text:", extractedText);

      // If an actionType was provided, immediately process the extracted text
      if (actionType) {
        generateContent(extractedText, actionType);
      }

    } catch (error) {
      console.error("Error extracting text from PDF:", error);
      alert("Failed to extract text from PDF.");
    }
  }

  getQuizButton.addEventListener("click", () => {
    if (!extractedText) {
      alert("No text extracted from the PDF.");
      return;
    }

    chrome.sidePanel.open({ windowId: currentWindowId });
    generateContent(extractedText, "quiz");
  });

  getSummaryButton.addEventListener("click", () => {
    if (!extractedText) {
      alert("No text extracted from the PDF.");
      return;
    }

    chrome.sidePanel.open({ windowId: currentWindowId });
    generateContent(extractedText, "summary");
  });

  async function generateContent(text, actionType) {
    let prompt = "";
    if (actionType === "quiz") {
      prompt = `Generate multiple-choice questions from the following text and provide answer in curly brackets, eg {A}. Place the answer at the end:\n\n${text}`;
    } else if (actionType === "summary") {
      prompt = `Summarize the following text:\n\n${text}`;
    }

    sendToOpenAI(prompt, actionType);
  }

  async function sendToOpenAI(prompt, actionType) {
    const apiKey = "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"; // Replace with actual API key

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 600,
          temperature: 0.7
        })
      });

      const result = await response.json();
      let output = "No response generated.";
      if (result.choices && result.choices[0] && result.choices[0].message) {
        output = result.choices[0].message.content.trim();
      }

      console.log(`Generated ${actionType}:`, output);

      // Send quiz or summary content to sidepanel.js
      chrome.runtime.sendMessage({
        action: "updateSidePanel",
        contentType: actionType,
        content: output
      });

    } catch (error) {
      console.error(`Error generating ${actionType}:`, error);
    }
  }
});
