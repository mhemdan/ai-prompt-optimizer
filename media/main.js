// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
    // @ts-ignore
    const vscode = acquireVsCodeApi(); // Get the API object to communicate with the extension host

    const promptInput = document.getElementById('prompt-input');
    const optimizeButton = document.getElementById('optimize-button');
    const resultOutput = document.getElementById('result-output');
    const copyButton = document.getElementById('copy-button');

    let currentResult = ''; // Store the current result for copying

    // Handle Optimize button click
    if (optimizeButton && promptInput) {
        optimizeButton.addEventListener('click', () => {
            const promptText = promptInput.value; // Standard JS property access
            if (promptText) {
                resultOutput.textContent = 'Optimizing...'; // Provide feedback
                copyButton.style.display = 'none'; // Hide copy button during optimization
                vscode.postMessage({
                    type: 'optimizePrompt',
                    value: promptText
                });
            } else {
                 resultOutput.textContent = 'Please enter a prompt first.';
            }
        });
    } else {
        console.error("Could not find optimize button or prompt input elements.");
    }

    // Handle Copy button click
    if (copyButton) {
        copyButton.addEventListener('click', () => {
            if (currentResult) {
                vscode.postMessage({
                    type: 'copyToClipboard',
                    value: currentResult
                });
            }
        });
    } else {
         console.error("Could not find copy button element.");
    }


    // Handle messages sent from the extension to the webview
    window.addEventListener('message', event => {
        const message = event.data; // The json data that the extension sent
        switch (message.type) {
            case 'showResult':
                {
                    currentResult = message.value;
                    resultOutput.textContent = currentResult;
                    copyButton.style.display = 'inline-block'; // Show copy button
                    break;
                }
            case 'showError': // Display error messages from the backend
                 {
                    resultOutput.textContent = `Error: ${message.value}`;
                    copyButton.style.display = 'none'; // Hide copy button on error
                    break;
                 }

        }
    });

}());