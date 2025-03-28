console.log("working")
if (!window.pdfScriptLoaded) {
    window.pdfScriptLoaded = true;
    
    const pdfScript = document.createElement("script");
    pdfScript.src = chrome.runtime.getURL("pdfjs/pdf.min.js");
    pdfScript.onload = () => {
      console.log("PDF.js loaded");
      window.pdfjsLib = window['pdfjs-dist/build/pdf'];
      
      const workerScript = document.createElement("script");
      workerScript.src = chrome.runtime.getURL("pdfjs/pdf.worker.min.js");
      document.head.appendChild(workerScript);
    };
    document.head.appendChild(pdfScript);
  }