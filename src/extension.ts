import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

// New System Prompt for conversational optimization
const conversationalSystemPrompt = `
You are an AI prompt optimizer. Your goal is to refine a user's initial prompt to make it clear, specific, and effective for AI coding tools.

1.  Analyze the user's input prompt.
2.  If the prompt is clear and detailed enough, return the final, optimized prompt directly, prefixed with "Optimized Prompt:".
3.  If the prompt is vague or lacks necessary details (e.g., target language, desired output format, specific constraints), ask a single, specific clarifying question to gather the missing information. Do NOT prefix questions with anything.
4.  Once you have enough information after asking questions, provide the final, optimized prompt, prefixed with "Optimized Prompt:".
5.  Be concise. Do not add conversational filler.
`;

// Use the new system prompt
const systemPrompt = conversationalSystemPrompt;

// Default config (keep this)
const defaultConfig = {
  apiUrl: "https://openrouter.ai/api/v1/chat/completions",
  apiKey: "",
  model: "openai/gpt-4o-mini" // Consider if a more powerful model is better for conversation
};

export function activate(context: vscode.ExtensionContext) {
  console.log("🚀 AI Prompt Optimizer extension activated!");

  const configDir = context.globalStorageUri.fsPath;
  const configPath = path.join(configDir, 'config.json');

  // --- Add View Provider ---
  const provider = new PromptOptimizerViewProvider(context.extensionUri, configPath, configDir);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(PromptOptimizerViewProvider.viewType, provider)
  );
  // --- End Add View Provider ---

  // Register the 'Copy Optimized Prompt' command (keep this)
  // Note: This might need adjustment depending on how the final UI presents the result
  context.subscriptions.push(
    vscode.commands.registerCommand('ai-prompt-optimizer.copyPrompt', (prompt: string) => {
      vscode.env.clipboard.writeText(prompt);
      vscode.window.showInformationMessage('Copied to clipboard!');
    })
  );

  // Register the 'Configure' command (keep this)
  context.subscriptions.push(
    vscode.commands.registerCommand('ai-prompt-optimizer.configure', async () => {
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
        console.log("Created configuration directory:", configDir);
      }

      if (!fs.existsSync(configPath)) {
        fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
        console.log("Created default config file:", configPath);
      }

      const uri = vscode.Uri.file(configPath);
      await vscode.window.showTextDocument(uri);
      vscode.window.showInformationMessage('Edit your API URL, key, and model in config.json, then save the file.');
    })
  );

  // Register the 'Show View' command (keep this)
  context.subscriptions.push(
    vscode.commands.registerCommand('ai-prompt-optimizer.showView', () => {
      console.log("Command 'ai-prompt-optimizer.showView' called.");
      // Attempt to reveal the view container
       vscode.commands.executeCommand('workbench.view.extension.ai-prompt-optimizer-activitybar');
    })
  );
}

// --- Add View Provider Class ---
class PromptOptimizerViewProvider implements vscode.WebviewViewProvider {

  public static readonly viewType = 'aiPromptOptimizerView'; // Must match the ID in package.json

  private _view?: vscode.WebviewView;
  private _conversationHistory: { role: string; content: string }[] = []; // Store conversation history

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _configPath: string,
    private readonly _configDir: string
  ) { }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,
      localResourceRoots: [
        this._extensionUri
      ]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async data => {
      switch (data.type) {
        case 'optimizePrompt': // Renamed from 'optimizePrompt' in JS, should be 'sendMessage' or similar
          {
            const userMessageContent = data.value;
            console.log("Received message from webview:", userMessageContent);

            // If it's the first message, initialize history
            if (this._conversationHistory.length === 0) {
                this._conversationHistory.push({ role: "system", content: systemPrompt });
            }
            // Add user's message to history
            this._conversationHistory.push({ role: "user", content: userMessageContent });

            // Show loading/thinking state in webview
            this._view?.webview.postMessage({ type: 'showLoading' });

            try {
                // Call API with current history
                const aiResponseMessage = await this._optimizePromptApiCall(this._conversationHistory);

                // Add AI's response to history
                this._conversationHistory.push(aiResponseMessage);

                // Send AI response content to webview
                this._view?.webview.postMessage({ type: 'addMessage', role: aiResponseMessage.role, value: aiResponseMessage.content });

                // If the response is the final optimized prompt, maybe clear history for next time?
                // Or allow further refinement? For now, keep history.
                // if (aiResponseMessage.content.startsWith("Optimized Prompt:")) {
                //     // Optional: Clear history after final prompt?
                //     // this._conversationHistory = [];
                // }

            } catch (error: any) {
                const errorMessage = error.message || 'An unknown error occurred during optimization.';
                console.error("Optimization Error:", error);
                vscode.window.showErrorMessage(`Optimization Failed: ${errorMessage}`);
                this._view?.webview.postMessage({ type: 'showError', value: `API Error: ${errorMessage}` });
                // Remove the last user message and potentially the system prompt if the call failed early
                if (this._conversationHistory.length > 0 && this._conversationHistory[this._conversationHistory.length - 1].role === 'user') {
                    this._conversationHistory.pop();
                    if (this._conversationHistory.length === 1 && this._conversationHistory[0].role === 'system') {
                        this._conversationHistory = []; // Reset if only system prompt remains after user pop
                    }
                }
            }
            break;
          }
        case 'clearChat': // Add a way to clear the chat/history
            {
                this._conversationHistory = [];
                this._view?.webview.postMessage({ type: 'clearChat' }); // Tell webview to clear its display
                console.log("Conversation history cleared.");
                break;
            }
        case 'copyToClipboard': // Handle copy request from webview
          {
            // Ensure we copy only the *final* optimized prompt content if possible
            const finalPromptPrefix = "Optimized Prompt:";
            let textToCopy = data.value;
            if (textToCopy.startsWith(finalPromptPrefix)) {
                textToCopy = textToCopy.substring(finalPromptPrefix.length).trim();
            }
            vscode.env.clipboard.writeText(textToCopy);
            vscode.window.showInformationMessage('Optimized prompt copied to clipboard!');
            break;
          }
        case 'showError': // Add a case to handle errors from webview if needed
            vscode.window.showErrorMessage(data.value);
            break;
      }
    });
  }

  // Modified to accept history and return the full message object
  private async _optimizePromptApiCall(messages: { role: string; content: string }[]): Promise<{ role: string; content: string }> {
      let apiUrl: string | undefined;
      let apiKey: string | undefined;
      let model: string | undefined;

      // --- Config reading logic (same as before) ---
      if (!fs.existsSync(this._configDir)) { fs.mkdirSync(this._configDir, { recursive: true }); }
      if (!fs.existsSync(this._configPath)) {
          console.log("Configuration file not found, creating default:", this._configPath);
          try {
              fs.writeFileSync(this._configPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
              apiUrl = defaultConfig.apiUrl; apiKey = defaultConfig.apiKey; model = defaultConfig.model;
              vscode.window.showWarningMessage("Config file created. Please run 'AI Prompt Optimizer: Configure' to add your API key.");
          } catch (error: any) { throw new Error(`Failed to create config file: ${error.message}. Please run the Configure command.`); }
      } else {
          try {
              const config = JSON.parse(fs.readFileSync(this._configPath, 'utf-8'));
              apiUrl = config.apiUrl; apiKey = config.apiKey; model = config.model || defaultConfig.model;
          } catch (error: any) { throw new Error(`Error reading config.json: ${error.message}. Run the Configure command to fix it.`); }
      }
      if (!apiUrl || !apiKey) { throw new Error("Missing API URL or key in config.json. Run the 'AI Prompt Optimizer: Configure' command."); }
      // --- End Config reading logic ---

      try {
          console.log("Making API request with history:", messages);
          const response = await axios.post(
              apiUrl,
              {
                  model: model,
                  messages: messages, // Send the whole history
                  max_tokens: 250, // Increased max_tokens slightly for conversation
                  temperature: 0.7
              },
              { headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" } }
          );

          console.log("API Response:", response.data);

          if (response.data && response.data.choices && response.data.choices.length > 0 && response.data.choices[0].message) {
              // Return the full message object (role: 'assistant', content: '...')
              return response.data.choices[0].message;
          } else {
              console.error("Unexpected API response structure:", response.data);
              throw new Error("Received an unexpected response structure from the API.");
          }

      } catch (error: any) {
          console.error("🔥 API call failed:", {
              url: apiUrl,
              model: model,
              // Avoid logging full history here for brevity/privacy if needed
              error: error.response?.data || error.message
          });

          const err = error.response?.data?.error?.message || JSON.stringify(error.response?.data || error.message);
          throw new Error(err); // Throw the specific API error message
      }
  }


  // --- _getHtmlForWebview needs update for chat display ---
  private _getHtmlForWebview(webview: vscode.Webview): string {
    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));

    // Do the same for the stylesheet.
    const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
    const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
    const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'));

    // Use a nonce to only allow specific scripts to be run
    const nonce = getNonce();

    // Updated HTML structure for basic chat display
    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">
				<title>AI Prompt Optimizer</title>
			</head>
			<body>
                <h2>Optimize AI Prompt</h2>

                <div id="conversation-area" class="conversation-area">
                    <!-- Conversation history will be appended here by JS -->
                </div>

                <div class="input-area">
                    <textarea id="prompt-input" rows="3" placeholder="Enter your initial prompt or reply here..."></textarea>
                    <div class="button-group">
                        <button id="send-button">Send</button>
                        <button id="clear-button">Clear Chat</button>
                    </div>
                </div>

                <!-- Copy button might be added dynamically by JS later -->
                <button id="copy-button" style="display: none; margin-top: 10px;">Copy Final Prompt</button>

				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
  }
}
// --- End View Provider Class ---


export function deactivate() {}

// Helper function for nonce (keep this)
function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}