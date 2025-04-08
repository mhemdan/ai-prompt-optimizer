// This script will be run within the webview itself
(function () {
    // @ts-ignore
    const vscode = acquireVsCodeApi(); // API to communicate with the extension host

    const promptInput = document.getElementById('prompt-input'); // Text area for input
    const sendButton = document.getElementById('send-button'); // Send button
    const clearButton = document.getElementById('clear-button'); // Clear button
    const conversationArea = document.getElementById('conversation-area'); // Div to display messages
    const copyButton = document.getElementById('copy-button'); // Copy button (initially hidden)

    let lastOptimizedPrompt = ''; // Store the final prompt for copying

    // --- Helper Function to Add Messages to UI ---
    function addMessageToUI(role, text, isThinking = false) {
        if (!conversationArea) return;

        // Remove previous thinking indicator if it exists
        const existingThinking = conversationArea?.querySelector('.thinking-indicator');
        if (existingThinking) {
            existingThinking.remove();
        }


        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', role === 'user' ? 'user-message' : 'assistant-message');
        if (isThinking) {
            messageDiv.classList.add('thinking-indicator'); // Add class to identify thinking message
        }

        // Basic text formatting (can be enhanced)
        const contentDiv = document.createElement('div');
        contentDiv.textContent = text;
        messageDiv.appendChild(contentDiv);

        conversationArea.appendChild(messageDiv);
        // Scroll to the bottom
        conversationArea.scrollTop = conversationArea.scrollHeight;

        // Check if this is the final optimized prompt
        const finalPromptPrefix = "Optimized Prompt:";
        if (role === 'assistant' && text.startsWith(finalPromptPrefix)) {
            lastOptimizedPrompt = text.substring(finalPromptPrefix.length).trim();
            copyButton.style.display = 'inline-block'; // Show copy button
        } else {
             // Hide copy button if it's not the final prompt
             if (role === 'assistant') {
                 copyButton.style.display = 'none';
                 lastOptimizedPrompt = '';
             }
        }
    }

    // --- Event Listeners ---

    // Handle Send button click
    if (sendButton && promptInput) {
        sendButton.addEventListener('click', () => {
            const promptText = promptInput.value.trim();
            if (promptText) {
                // Add user message to UI immediately
                addMessageToUI('user', promptText);

                // Send message to extension host
                vscode.postMessage({
                    type: 'optimizePrompt', // This type is handled in extension.ts
                    value: promptText
                });

                // Clear the input field
                promptInput.value = '';
                copyButton.style.display = 'none'; // Hide copy button while waiting for response
                lastOptimizedPrompt = '';
            }
        });
    } else {
        console.error("Could not find send button or prompt input elements.");
    }

     // Allow sending with Enter key in textarea (Shift+Enter for newline)
     if (promptInput) {
        promptInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault(); // Prevent default newline insertion
                sendButton.click(); // Trigger send button click
            }
        });
    }

    // Handle Clear button click
    if (clearButton) {
        clearButton.addEventListener('click', () => {
            vscode.postMessage({ type: 'clearChat' });
        });
    } else {
        console.error("Could not find clear button element.");
    }

    // Handle Copy button click
    if (copyButton) {
        copyButton.addEventListener('click', () => {
            if (lastOptimizedPrompt) {
                vscode.postMessage({
                    type: 'copyToClipboard',
                    value: lastOptimizedPrompt // Send only the optimized part
                });
            }
        });
    } else {
         console.error("Could not find copy button element.");
    }


    // --- Handle Messages from Extension Host ---
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'addMessage': // Add AI message from host
                {
                    addMessageToUI(message.role, message.value);
                    // Re-enable input/button if they were disabled during loading
                    promptInput.disabled = false;
                    sendButton.disabled = false;
                    break;
                }
            case 'showLoading': // Show loading state
                 {
                    // Optional: Add a visual loading indicator
                    // Disable input/button while loading
                    promptInput.disabled = true;
                    sendButton.disabled = true;
                    addMessageToUI('assistant', 'Thinking...', true); // Pass thinking flag
                    copyButton.style.display = 'none';
                    lastOptimizedPrompt = '';
                    break;
                 }
            case 'clearChat': // Clear the UI display
                {
                    conversationArea.innerHTML = ''; // Clear messages
                    promptInput.value = ''; // Clear input
                    promptInput.disabled = false; // Re-enable
                    sendButton.disabled = false; // Re-enable
                    copyButton.style.display = 'none'; // Hide copy button
                    lastOptimizedPrompt = '';
                    break;
                }
            case 'showError': // Display error messages from the backend
                 {
                    addMessageToUI('assistant', `Error: ${message.value}`);
                    // Re-enable input/button after error
                    promptInput.disabled = false;
                    sendButton.disabled = false;
                    copyButton.style.display = 'none';
                    lastOptimizedPrompt = '';
                    break;
                 }
        }
    });

}());