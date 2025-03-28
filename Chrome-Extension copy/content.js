// content.js
function extractPDFText() {
  try {
    const viewer = document.querySelector('pdf-viewer');
    if (!viewer) {
      console.error('PDF viewer not found');
      return null;
    }
    
    const container = viewer.shadowRoot.querySelector('#viewer');
    return container?.innerText || '';
  } catch (error) {
    console.error('Text extraction failed:', error);
    return null;
  }
}

// Listen for extraction requests from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'extractPDFText') {
    const text = extractPDFText();
    sendResponse({ text: text });
  }
  return true; // Keep channel open for async
});

// content.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractPDF') {
    const viewer = document.querySelector('pdf-viewer');
    const text = viewer?.shadowRoot.querySelector('#viewer').innerText || '';
    sendResponse({ text: text });
  }
  return true;
});