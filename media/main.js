// media/main.js
(function () {
    const vscode = acquireVsCodeApi();
    const promptInput = document.getElementById('prompt-input');
    const sendButton = document.getElementById('send-button');
    const clearButton = document.getElementById('clear-button');
    const conversationArea = document.getElementById('conversation-area');
    const copyButtonContainer = document.getElementById('copy-button-container');
    const copyButton = document.getElementById('copy-button');
    let lastOptimizedPrompt = '';

    // --- Helper Functions ---
    function addThinkingIndicator() {
        removeThinkingIndicator(); // Remove any existing indicator first
        const thinkingDiv = document.createElement('div');
        thinkingDiv.classList.add('message', 'assistant-message', 'thinking-indicator');
        thinkingDiv.textContent = 'Thinking...';
        conversationArea.appendChild(thinkingDiv);
        conversationArea.scrollTop = conversationArea.scrollHeight;
    }

    function removeThinkingIndicator() {
        const thinkingIndicator = document.querySelector('.thinking-indicator');
        if (thinkingIndicator) {
            thinkingIndicator.remove();
        }
    }

    function addMessageToUI(role, text, isOptimizedPrompt = false) {
        removeThinkingIndicator();
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', role === 'user' ? 'user-message' : 'assistant-message');
        
        const contentDiv = document.createElement('div');
        contentDiv.textContent = text;
        messageDiv.appendChild(contentDiv);
        
        conversationArea.appendChild(messageDiv);
        conversationArea.scrollTop = conversationArea.scrollHeight;

        // Handle optimized prompt separately
        if (isOptimizedPrompt && text.includes('Optimized Prompt:')) {
            const optimizedPrompt = text.split('Optimized Prompt:')[1].trim();
            lastOptimizedPrompt = optimizedPrompt;
            showCopyButton(optimizedPrompt);
        }
    }

    function showCopyButton(optimizedPrompt) {
        copyButton.onclick = () => {
            vscode.postMessage({
                type: 'copyToClipboard',
                value: optimizedPrompt
            });
        };
        copyButtonContainer.style.display = 'block';
    }

    function hideCopyButton() {
        copyButtonContainer.style.display = 'none';
    }

    function clearChat() {
        conversationArea.innerHTML = '';
        promptInput.value = '';
        promptInput.disabled = false;
        sendButton.disabled = false;
        lastOptimizedPrompt = '';
        hideCopyButton();
    }

    // --- Event Listeners ---
    if (sendButton && promptInput) {
        sendButton.addEventListener('click', () => {
            const promptText = promptInput.value.trim();
            if (promptText) {
                addMessageToUI('user', promptText);
                vscode.postMessage({
                    type: 'optimizePrompt',
                    value: promptText
                });
                promptInput.value = '';
            }
        });
    }

    if (promptInput) {
        promptInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendButton.click();
            }
        });
    }

    if (clearButton) {
        clearButton.addEventListener('click', () => {
            vscode.postMessage({ type: 'clearChat' });
        });
    }

    // --- Handle Messages from Extension Host ---
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'addMessage': {
                promptInput.disabled = false;
                sendButton.disabled = false;
                addMessageToUI(message.role, message.value, message.isOptimizedPrompt);
                break;
            }
            case 'showLoading': {
                promptInput.disabled = true;
                sendButton.disabled = true;
                addThinkingIndicator();
                break;
            }
            case 'clearChat': {
                clearChat();
                break;
            }
            case 'showError': {
                removeThinkingIndicator();
                addMessageToUI('assistant', `Error: ${message.value}`);
                promptInput.disabled = false;
                sendButton.disabled = false;
                break;
            }
            case 'copySuccess': {
                // Optional: Show a temporary success message
                const successDiv = document.createElement('div');
                successDiv.textContent = 'Copied to clipboard!';
                successDiv.className = 'copy-success-message';
                copyButtonContainer.appendChild(successDiv);
                setTimeout(() => successDiv.remove(), 2000);
                break;
            }
        }
    });
}());
