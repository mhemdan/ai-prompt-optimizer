// src/extension.ts

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { TemplateEngine } from './templates/TemplateEngine';
import { ContextAnalyzer } from './context/ContextAnalyzer';
import { PromptCache } from './cache/PromptCache';
import { ConfigManager } from './config/ConfigManager';
import { SettingsWebview } from './config/SettingsWebview';
import { enhancedSystemPrompt } from './prompts/systemPrompt';

export function activate(context: vscode.ExtensionContext) {
  console.log('🚀 AI Prompt Optimizer extension activated!');

  // Initialize core services
  const configManager = ConfigManager.getInstance(context);

  // Initialize the view provider
  const provider = new PromptOptimizerViewProvider(
    context.extensionUri,
    configManager
  );

  // Register WebView Provider
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      PromptOptimizerViewProvider.viewType,
      provider
    )
  );

  // Register Commands
  registerCommands(context, provider, configManager);

  // Setup Configuration Watcher
  setupConfigWatcher(context, configManager);
}

class PromptOptimizerViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'aiPromptOptimizerView';

  private _view?: vscode.WebviewView;
  private _conversationHistory: { role: string; content: string }[] = [];
  private templateEngine: TemplateEngine;
  private contextAnalyzer: ContextAnalyzer;
  private promptCache: PromptCache;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly configManager: ConfigManager
  ) {
    this.templateEngine = new TemplateEngine();
    this.contextAnalyzer = new ContextAnalyzer();
    this.promptCache = new PromptCache(
      configManager.get('cache').maxEntries,
      configManager.get('cache').ttlMinutes
    );
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    this._setupWebviewMessageListener(webviewView.webview);
  }

  private _setupWebviewMessageListener(webview: vscode.Webview) {
    webview.onDidReceiveMessage(async (data) => {
      try {
        switch (data.type) {
          case 'optimizePrompt':
            await this._handleOptimizePrompt(data.value);
            break;

          case 'clearChat':
            await this._handleClearChat();
            break;

          case 'copyToClipboard':
            await this._handleCopyToClipboard(data.value);
            break;

          case 'applyTemplate':
            await this._handleApplyTemplate(data.templateId, data.variables);
            break;

          case 'openSettings':
            await vscode.commands.executeCommand('ai-prompt-optimizer.openConfig');
            break;
        }
      } catch (error) {
        this._handleError(error);
      }
    });
  }

  private async _handleOptimizePrompt(userMessageContent: string) {
    try {
      // Remove any existing thinking indicator first
      this._view?.webview.postMessage({ type: 'removeThinking' });

      // Show new thinking indicator
      this._view?.webview.postMessage({ type: 'showLoading' });

      // Initialize conversation if first message
      if (this._conversationHistory.length === 0) {
        this._conversationHistory.push({
          role: "system",
          content: enhancedSystemPrompt
        });
      }

      // Add user message to history
      this._conversationHistory.push({
        role: "user",
        content: userMessageContent
      });

      // Get API response
      const aiResponseMessage = await this._optimizePromptApiCall(
        this._conversationHistory,
        {}
      );

      // Add response to history
      this._conversationHistory.push(aiResponseMessage);

      // Check if this contains an optimized prompt
      const hasOptimizedPrompt = aiResponseMessage.content.includes('Optimized Prompt:');

      // Send response to webview
      this._view?.webview.postMessage({
        type: 'addMessage',
        role: aiResponseMessage.role,
        value: aiResponseMessage.content,
        isOptimizedPrompt: hasOptimizedPrompt
      });

    } catch (error) {
      this._handleError(error);
    }
  }


  private _addMessageToConversation(role: string, content: string) {
    this._view?.webview.postMessage({
      type: 'addMessage',
      role: role,
      value: content
    });
  }

  private async _optimizePromptApiCall(
    messages: { role: string; content: string }[],
    context: any
  ): Promise<{ role: string; content: string }> {
    const config = this.configManager.getConfig();
    const provider = config.api.defaultProvider;
    const providerConfig = config.api[provider as keyof typeof config.api];

    // Debug logging
    console.log('Current provider:', provider);
    console.log('API Endpoint:', this.configManager.getApiEndpoint());
    console.log('Selected model:', providerConfig?.model);
    // Don't log the full API key for security
    console.log('API Key present:', !!providerConfig?.apiKey);

    if (!providerConfig?.apiKey) {
      throw new Error('Please configure your API key in the settings (click the gear icon)');
    }

    try {
      const response = await axios.post(
        this.configManager.getApiEndpoint(),
        {
          model: providerConfig.model,
          messages: messages,
          max_tokens: config.api.maxTokens,
          temperature: config.api.temperature,
          context: context
        },
        {
          headers: {
            "Authorization": `Bearer ${providerConfig.apiKey}`,
            "Content-Type": "application/json",
            // Add OpenRouter specific headers if using OpenRouter
            ...(provider === 'openrouter' && {
              "HTTP-Referer": "https://github.com/yourusername/your-extension",
              "X-Title": "VS Code AI Prompt Optimizer"
            })
          }
        }
      );

      if (response.data?.choices?.[0]?.message) {
        return response.data.choices[0].message;
      }

      throw new Error("Unexpected API response structure");

    } catch (error: any) {
      console.error('API call error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });

      // Provide more specific error messages
      if (error.response?.status === 401) {
        throw new Error('Invalid API key. Please check your API key in the settings.');
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (error.response?.data?.error?.message) {
        throw new Error(`API Error: ${error.response.data.error.message}`);
      }

      throw new Error(`API call failed: ${error.message}`);
    }
  }

  private async _handleClearChat() {
    this._conversationHistory = [];
    this._view?.webview.postMessage({ type: 'clearChat' });
  }

  private async _handleCopyToClipboard(text: string) {
    try {
      await vscode.env.clipboard.writeText(text);
      this._view?.webview.postMessage({
        type: 'copySuccess'
      });
      vscode.window.showInformationMessage('Prompt copied to clipboard!');
    } catch (error) {
      vscode.window.showErrorMessage('Failed to copy to clipboard');
    }
  }
  private async _handleApplyTemplate(templateId: string, variables: Record<string, string>) {
    try {
      const template = this.templateEngine.getTemplate(templateId);
      if (template) {
        const promptText = this.templateEngine.applyTemplate(templateId, variables);
        await this._handleOptimizePrompt(promptText);
      }
    } catch (error) {
      this._handleError(error);
    }
  }

  private _handleError(error: any) {
    const errorMessage = error.message || 'An unknown error occurred';
    console.error("Error:", error);
    vscode.window.showErrorMessage(`AI Prompt Optimizer: ${errorMessage}`);
    this._view?.webview.postMessage({
      type: 'showError',
      value: errorMessage
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js')
    );
    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css')
    );
    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css')
    );
    const styleMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css')
    );
    const codiconUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'codicon.css')
    );
    const nonce = getNonce();

    return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="${styleResetUri}" rel="stylesheet">
            <link href="${styleVSCodeUri}" rel="stylesheet">
            <link href="${styleMainUri}" rel="stylesheet">
            <link href="${codiconUri}" rel="stylesheet">
            <title>AI Prompt Optimizer</title>
        </head>
        <body>
            <div class="header">
                <h2>Optimize AI Prompt</h2>
                <button id="settings-button" class="icon-button" title="Open Settings">
                    <i class="codicon codicon-gear"></i>
                </button>
            </div>

            <div id="conversation-area" class="conversation-area">
                <!-- Conversation messages will be added here -->
            </div>

            <!-- Copy button container positioned outside conversation area -->
            <div id="copy-button-container" class="copy-button-container">
                <button id="copy-button" class="copy-button">Copy Prompt</button>
            </div>

            <div class="input-area">
                <textarea 
                    id="prompt-input" 
                    rows="3" 
                    placeholder="Enter your initial prompt or reply here..."
                ></textarea>
                <div class="button-group">
                    <button id="send-button">Send</button>
                    <button id="clear-button">Clear Chat</button>
                </div>
            </div>

            <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
        </html>`;
  }

}

function registerCommands(
  context: vscode.ExtensionContext,
  provider: PromptOptimizerViewProvider,
  configManager: ConfigManager
) {
  // Register the 'Configure' command
  context.subscriptions.push(
    vscode.commands.registerCommand('ai-prompt-optimizer.openConfig', () => {
      SettingsWebview.render(context.extensionUri, configManager);
    })
  );

  // Register the 'Show View' command
  context.subscriptions.push(
    vscode.commands.registerCommand('ai-prompt-optimizer.showView', () => {
      vscode.commands.executeCommand(
        'workbench.view.extension.ai-prompt-optimizer-activitybar'
      );
    })
  );

  // Register the 'Copy Prompt' command
  context.subscriptions.push(
    vscode.commands.registerCommand('ai-prompt-optimizer.copyPrompt', async (prompt: string) => {
      await vscode.env.clipboard.writeText(prompt);
      vscode.window.showInformationMessage('Prompt copied to clipboard!');
    })
  );

  // Register the 'Reset Config' command
  context.subscriptions.push(
    vscode.commands.registerCommand('ai-prompt-optimizer.resetConfig', async () => {
      try {
        await configManager.resetToDefaults();
        vscode.window.showInformationMessage('Configuration has been reset to defaults');
      } catch (error) {
        vscode.window.showErrorMessage('Failed to reset configuration');
      }
    })
  );
}

function setupConfigWatcher(
  context: vscode.ExtensionContext,
  configManager: ConfigManager
) {
  const configWatcher = vscode.workspace.createFileSystemWatcher('**/config.json');

  configWatcher.onDidChange(async () => {
    try {
      await configManager.loadConfig();
      vscode.window.showInformationMessage(
        'AI Prompt Optimizer configuration updated'
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        'Failed to reload configuration. Please check the file format.'
      );
    }
  });

  context.subscriptions.push(configWatcher);
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

export function deactivate() { }
