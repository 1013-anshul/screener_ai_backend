document.getElementById("askBtn").addEventListener("click", async () => {
    const question = document.getElementById("question").value.trim();
    if (!question) {
      alert("Please type a question.");
      return;
    }
  
    // Get saved PDF URL
    chrome.storage.local.get("currentPdfUrl", ({ currentPdfUrl }) => {
      if (!currentPdfUrl) {
        alert("No transcript selected. Please click 'Ask Q' next to a transcript link first.");
        return;
      }
  
      // Send request to backend
      fetch("http://localhost:8000/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdf_url: currentPdfUrl, question })
      })
        .then(res => res.json())
        .then(data => {
          document.getElementById("answer").textContent = data.answer || "No answer received.";
        })
        .catch(err => {
          document.getElementById("answer").textContent = "Error contacting backend.";
          console.error(err);
        });
    });
  });
  