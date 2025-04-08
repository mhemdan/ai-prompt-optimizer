import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

// System prompt (keep this)
const systemPrompt = `
You are an AI prompt optimizer. Your task is to take the user's input prompt and improve it for clarity, specificity, and effectiveness when used with AI coding tools like Cursor AI or Continue Dev. Return only the optimized prompt without additional commentary.
Example:
- Input: "Write some code"
- Output: "Generate a Python function with clear variable names and error handling for a specific task"
`;

// Default config (keep this)
const defaultConfig = {
  apiUrl: "https://openrouter.ai/api/v1/chat/completions",
  apiKey: "",
  model: "openai/gpt-4o-mini"
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
  context.subscriptions.push(
    vscode.commands.registerCommand('ai-prompt-optimizer.copyPrompt', (prompt: string) => {
      vscode.env.clipboard.writeText(prompt);
      vscode.window.showInformationMessage('Optimized prompt copied to clipboard!');
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

  // Register the 'Show View' command (add this)
  context.subscriptions.push(
    vscode.commands.registerCommand('ai-prompt-optimizer.showView', () => {
      // This command is less critical now as the activity bar icon will show the view,
      // but it's good practice to have it. It might require focusing the view if already open.
      // For simplicity, we'll just log for now. A more robust implementation
      // might use vscode.commands.executeCommand('workbench.view.extension.ai-prompt-optimizer-activitybar');
      // or focus the specific view if needed.
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
        case 'optimizePrompt':
          {
            // --- Restore API Call Logic Here ---
            console.log("Received prompt from webview:", data.value);
            // Placeholder: Send back the original prompt for now
            // TODO: Implement the actual API call using data.value as userPrompt
            // Need to read config, make axios call, handle errors, postMessage result

            try {
                const optimizedPrompt = await this._optimizePromptApiCall(data.value);
                this._view?.webview.postMessage({ type: 'showResult', value: optimizedPrompt });
            } catch (error: any) {
                const errorMessage = error.message || 'An unknown error occurred during optimization.';
                console.error("Optimization Error:", error);
                vscode.window.showErrorMessage(`Optimization Failed: ${errorMessage}`);
                // Optionally send error back to webview
                this._view?.webview.postMessage({ type: 'showError', value: `API Error: ${errorMessage}` });
            }
            break;
          }
        case 'copyToClipboard': // Handle copy request from webview
          {
            vscode.env.clipboard.writeText(data.value);
            vscode.window.showInformationMessage('Optimized prompt copied to clipboard!');
            break;
          }
        case 'showError': // Add a case to handle errors from webview if needed
            vscode.window.showErrorMessage(data.value);
            break;
      }
    });
  }

  // Placeholder for the actual API call logic
  private async _optimizePromptApiCall(userPrompt: string): Promise<string> {
      let apiUrl: string | undefined;
      let apiKey: string | undefined;
      let model: string | undefined;

      // Ensure the config directory exists (redundant check, but safe)
      if (!fs.existsSync(this._configDir)) {
          fs.mkdirSync(this._configDir, { recursive: true });
      }

      // Check if the config file exists, create if not
      if (!fs.existsSync(this._configPath)) {
          console.log("Configuration file not found, creating default:", this._configPath);
          try {
              fs.writeFileSync(this._configPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
              apiUrl = defaultConfig.apiUrl;
              apiKey = defaultConfig.apiKey; // Will be empty, causing error below
              model = defaultConfig.model;
              vscode.window.showWarningMessage("Config file created. Please run 'AI Prompt Optimizer: Configure' to add your API key.");
          } catch (error: any) {
              console.error("Error creating default config file:", error);
              throw new Error(`Failed to create config file: ${error.message}. Please run the Configure command.`);
          }
      } else {
          // Read and parse the config file
          try {
              const config = JSON.parse(fs.readFileSync(this._configPath, 'utf-8'));
              console.log("Loaded configuration:", config);
              apiUrl = config.apiUrl;
              apiKey = config.apiKey;
              model = config.model || defaultConfig.model; // Use default model if not specified
          } catch (error: any) {
              console.error("Error reading config.json:", error);
              throw new Error(`Error reading config.json: ${error.message}. Run the Configure command to fix it.`);
          }
      }

      // Check if API URL and key are available
      if (!apiUrl || !apiKey) {
          console.log("Missing API URL or key in config.json");
          throw new Error("Missing API URL or key in config.json. Run the 'AI Prompt Optimizer: Configure' command.");
      }

      // Make the API request to optimize the prompt
      try {
          console.log("Making API request to:", apiUrl);
          const response = await axios.post(
              apiUrl,
              {
                  model: model,
                  messages: [
                      { role: "system", content: systemPrompt },
                      { role: "user", content: userPrompt }
                  ],
                  max_tokens: 150,
                  temperature: 0.7
              },
              {
                  headers: {
                      "Authorization": `Bearer ${apiKey}`,
                      "Content-Type": "application/json"
                  }
              }
          );

          console.log("API Response:", response.data);

          if (response.data && response.data.choices && response.data.choices.length > 0 && response.data.choices[0].message) {
              return response.data.choices[0].message.content.trim();
          } else {
              console.error("Unexpected API response structure:", response.data);
              throw new Error("Received an unexpected response structure from the API.");
          }

      } catch (error: any) {
          console.error("🔥 API call failed:", {
              url: apiUrl,
              model: model,
              headers: {
                  Authorization: `Bearer ${apiKey?.slice(0, 6)}...`,
                  "Content-Type": "application/json"
              },
              error: error.response?.data || error.message
          });

          const err = error.response?.data?.error?.message || JSON.stringify(error.response?.data || error.message);
          throw new Error(err); // Throw the specific API error message
      }
  }


  private _getHtmlForWebview(webview: vscode.Webview): string {
    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));

    // Do the same for the stylesheet.
    const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
    const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
    const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'));

    // Use a nonce to only allow specific scripts to be run
    const nonce = getNonce();

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
					Use a content security policy to only allow loading styles from our extension directory,
					and only allow running scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">

				<title>AI Prompt Optimizer</title>
			</head>
			<body>
        <h2>Optimize AI Prompt</h2>
				<textarea id="prompt-input" rows="5" placeholder="Enter your prompt here..."></textarea>
        <button id="optimize-button">Optimize</button>

        <hr>
        <h3>Optimized Prompt:</h3>
        <div id="result-output" style="white-space: pre-wrap; word-wrap: break-word;"></div>
        <button id="copy-button" style="display: none;">Copy Result</button>


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