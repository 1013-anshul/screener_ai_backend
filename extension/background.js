// Background script to handle messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "openPopup") {
      // Note: Chrome doesn't allow programmatically opening popups
      // The user must click the extension icon manually
      console.log("Popup open requested - user must click extension icon");
      
      // We could show a browser notification instead
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png', // You'll need to add an icon
        title: 'Transcript Ready',
        message: 'Click the extension icon to ask your question about the transcript.'
      });
    }
  });
  
  // Optional: Add notification permission to manifest if you want to use notifications
  // "permissions": ["activeTab", "scripting", "storage", "notifications"]