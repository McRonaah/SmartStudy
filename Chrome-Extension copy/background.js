// Add this to your existing background message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "requestPDFData") {
    if (cachedPDFData) {
      sendResponse({ pdfData: cachedPDFData });
    } else {
      sendResponse({ pdfData: null });
    }
    return true; // Keep message channel open for async response
  }
});

// background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'extract') {
    console.log("output")
    console.log(message.content)
    // Forward to side panel
    chrome.runtime.sendMessage({
      action: 'displayContent',
      contentType: message.contentType,
      content: message.content
    });
  }
  return true;
});

chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["inject-pdf.js"]
    }, () => {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
      });
      console.log("Scripts injected from action button.");
    });
  } else {
    console.error("No active tab found for script injection.");
  }
});





chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "sendPDFData") {
      // Forward the message to the side panel
      chrome.runtime.sendMessage({
          action: "receivePDFData",
          pdfData: message.pdfData,
          actionType: message.actionType
      });
  }
});


//sign in functionality
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'signInWithGoogle') {
    chrome.identity.launchWebAuthFlow({
      url: request.authUrl,
      interactive: true
    }, (responseUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({
          error: chrome.runtime.lastError.message,
          success: false
        });
        return;
      }

      try {
        const url = new URL(responseUrl);
        const hashParams = new URLSearchParams(url.hash.substring(1));
        sendResponse({
          success: true,
          access_token: hashParams.get('access_token'),
          refresh_token: hashParams.get('refresh_token')
        });
      } catch (error) {
        sendResponse({
          error: 'Invalid authentication response',
          success: false
        });
      }
    });

    return true; // Keep message channel open
  }
});