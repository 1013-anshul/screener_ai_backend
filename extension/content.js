// =================================================================================
// == Screener AI Sidebar - content.js
// =================================================================================

// --- Phase 1: The User Interface (HTML and CSS) ---

// CSS styles for the sidebar and chat interface.
const sidebarStyles = `
  :root {
    --sidebar-bg: #ffffff;
    --sidebar-width: 400px;
    --brand-color: #0d6efd;
    --text-color: #212529;
    --border-color: #dee2e6;
    --user-msg-bg: #e9f5ff;
    --ai-msg-bg: #f8f9fa;
  }
  #ai-sidebar-toggle {
    position: fixed;
    bottom: 30px;
    right: 30px;
    width: 60px;
    height: 60px;
    background-color: var(--brand-color);
    color: white;
    border-radius: 50%;
    border: none;
    font-size: 24px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 9998;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  #ai-chat-sidebar {
    position: fixed;
    top: 0;
    right: 0;
    width: var(--sidebar-width);
    height: 100%;
    background-color: var(--sidebar-bg);
    border-left: 1px solid var(--border-color);
    box-shadow: -2px 0 15px rgba(0,0,0,0.1);
    z-index: 9999;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    transform: translateX(100%);
    transition: transform 0.3s ease-in-out;
    display: flex;
    flex-direction: column;
  }
  #ai-chat-sidebar.open {
    transform: translateX(0);
  }
  .sidebar-header {
    padding: 1rem;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .sidebar-header h3 {
    margin: 0;
    font-size: 1.2rem;
    color: var(--text-color);
  }
  .sidebar-header .close-btn {
    font-size: 1.5rem;
    cursor: pointer;
    background: none;
    border: none;
  }
  .sidebar-content {
    padding: 1rem;
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow-y: hidden;
  }
  #transcript-selector-label, #suggested-questions-label {
      font-weight: 600;
      font-size: 0.9rem;
      color: #555;
  }
  #transcript-selector {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: 6px;
  }
  #chat-messages {
    flex-grow: 1;
    overflow-y: auto;
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background-color: #f9f9f9;
  }
  .message {
    padding: 0.75rem 1rem;
    border-radius: 12px;
    max-width: 85%;
    line-height: 1.5;
  }
  .message.user {
    background-color: var(--user-msg-bg);
    color: #004085;
    align-self: flex-end;
    border-bottom-right-radius: 0;
  }
  .message.ai {
    background-color: var(--ai-msg-bg);
    border: 1px solid var(--border-color);
    align-self: flex-start;
    border-bottom-left-radius: 0;
  }
  .message.loading {
    color: #6c757d;
    font-style: italic;
  }
  .suggested-questions-container {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .suggested-question {
    background-color: transparent;
    border: 1px solid var(--brand-color);
    color: var(--brand-color);
    padding: 0.4rem 0.8rem;
    border-radius: 20px;
    cursor: pointer;
    font-size: 0.8rem;
  }
  .chat-input-area {
    padding: 1rem;
    border-top: 1px solid var(--border-color);
    display: flex;
    gap: 0.5rem;
  }
  #chat-input {
    flex-grow: 1;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 0.75rem;
  }
  #send-button {
    border: none;
    background-color: var(--brand-color);
    color: white;
    padding: 0 1.5rem;
    border-radius: 6px;
    cursor: pointer;
  }
`;

// --- Phase 2: The Logic ---

let transcriptStore = []; // To hold { text, url } of found transcripts
let selectedTranscriptUrl = '';

// Function to call the backend
async function askBackend(question, pdfUrl) {
  try {
    const response = await fetch("http://localhost:8000/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pdf_url: pdfUrl, question })
    });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data.answer || "No answer received.";
  } catch (err) {
    console.error("Error contacting backend:", err);
    return "Error: Could not contact the backend. Is the server running?";
  }
}

// Function to add messages to the chat window
function addMessage(text, type) {
  const messagesContainer = document.getElementById('chat-messages');
  // Remove any "loading" message
  const loadingMsg = messagesContainer.querySelector('.loading');
  if (loadingMsg) loadingMsg.remove();
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}`;
  messageDiv.textContent = text;
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight; // Auto-scroll
}

// Main function to handle a question
async function handleQuestion(question) {
  if (!question.trim() || !selectedTranscriptUrl) {
    alert("Please select a transcript and type a question.");
    return;
  }
  addMessage(question, 'user');
  addMessage('Thinking...', 'ai loading'); // Show loading indicator

  const answer = await askBackend(question, selectedTranscriptUrl);
  addMessage(answer, 'ai');
}

// Function to initialize the entire sidebar and its functionality
function initializeSidebar() {
  // --- A. Find the transcripts on the page (similar to before) ---
  const concallsHeader = Array.from(document.querySelectorAll('h3, h4, h5')).find(h => h.textContent.trim().includes('Concalls'));
  if (!concallsHeader) return;
  const searchArea = concallsHeader.closest('.card, .company-section, .col-md-6') || document.body;
  
  let links = Array.from(searchArea.querySelectorAll('a'))
    .filter(link => link.textContent.trim().toLowerCase() === 'transcript')
    .slice(0, 10);
  
  transcriptStore = links.map(link => ({
    text: link.parentElement.innerText.replace('Transcript', '').trim(), // Get concall date/title
    url: link.href
  }));
  
  if (transcriptStore.length === 0) return;
  selectedTranscriptUrl = transcriptStore[0].url; // Default to the latest

  // --- B. Create and inject the UI elements ---
  
  // Inject styles
  const styleSheet = document.createElement("style");
  styleSheet.innerText = sidebarStyles;
  document.head.appendChild(styleSheet);

  // Inject sidebar HTML
  const sidebarContainer = document.createElement('div');
  sidebarContainer.innerHTML = `
    <button id="ai-sidebar-toggle">AI</button>
    <div id="ai-chat-sidebar">
      <div class="sidebar-header">
        <h3>Concall AI</h3>
        <button class="close-btn">&times;</button>
      </div>
      <div class="sidebar-content">
        <label id="transcript-selector-label" for="transcript-selector">Active Transcript:</label>
        <select id="transcript-selector">
          ${transcriptStore.map(t => `<option value="${t.url}">${t.text}</option>`).join('')}
        </select>
        <div id="chat-messages"></div>
        <div id="suggested-questions-area">
            <label id="suggested-questions-label">Suggestions:</label>
            <div class="suggested-questions-container">
              <button class="suggested-question">Summarize the key takeaways.</button>
              <button class="suggested-question">What is the management's outlook for the next quarter?</button>
              <button class="suggested-question">Were there any commitments made by the management?</button>
            </div>
        </div>
      </div>
      <div class="chat-input-area">
        <input type="text" id="chat-input" placeholder="Ask a question...">
        <button id="send-button">Send</button>
      </div>
    </div>
  `;
  document.body.appendChild(sidebarContainer);

  // --- C. Add Event Listeners ---
  
  const sidebar = document.getElementById('ai-chat-sidebar');
  const toggleButton = document.getElementById('ai-sidebar-toggle');
  const closeButton = sidebar.querySelector('.close-btn');
  const sendButton = document.getElementById('send-button');
  const chatInput = document.getElementById('chat-input');
  const transcriptSelector = document.getElementById('transcript-selector');
  
  toggleButton.addEventListener('click', () => sidebar.classList.add('open'));
  closeButton.addEventListener('click', () => sidebar.classList.remove('open'));
  
  transcriptSelector.addEventListener('change', (e) => {
      selectedTranscriptUrl = e.target.value;
      addMessage(`Now chatting with ${e.target.options[e.target.selectedIndex].text}.`, 'ai');
  });

  sendButton.addEventListener('click', () => {
      handleQuestion(chatInput.value);
      chatInput.value = '';
  });
  
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      handleQuestion(chatInput.value);
      chatInput.value = '';
    }
  });

  sidebar.querySelectorAll('.suggested-question').forEach(button => {
    button.addEventListener('click', () => {
        handleQuestion(button.textContent);
    });
  });
}

// --- Phase 3: Run Everything ---
// Wait for the page to be relatively stable before initializing
setTimeout(initializeSidebar, 2000);