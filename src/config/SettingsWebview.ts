// src/config/SettingsWebview.ts

import * as vscode from 'vscode';
import { ConfigManager } from './ConfigManager';

export class SettingsWebview {
    public static readonly viewType = 'aiPromptOptimizerSettings';
    private readonly _panel: vscode.WebviewPanel;
    private readonly _configManager: ConfigManager;

    private constructor(panel: vscode.WebviewPanel, configManager: ConfigManager) {
        this._panel = panel;
        this._configManager = configManager;
        this._update();
        this._setWebviewMessageListener();
    }

    public static render(extensionUri: vscode.Uri, configManager: ConfigManager) {
        const panel = vscode.window.createWebviewPanel(
            SettingsWebview.viewType,
            'Settings', // Shorter title
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [extensionUri]
            }
        );
        return new SettingsWebview(panel, configManager);
    }

    private _update() {
        const config = this._configManager.getConfig();
        this._panel.webview.html = this._getHtmlForWebview(config);
    }

    private _setWebviewMessageListener() {
        this._panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'saveConfig':
                    try {
                        console.log('Saving configuration:', {
                            provider: message.value.api.defaultProvider,
                            hasApiKey: !!message.value.api[message.value.api.defaultProvider]?.apiKey,
                            endpoint: message.value.api[message.value.api.defaultProvider]?.endpoint
                        });
    
                        await this._configManager.updateConfig(message.value);
                        
                        // Verify the configuration was saved
                        const newConfig = this._configManager.getConfig();
                        console.log('Configuration saved:', {
                            provider: newConfig.api.defaultProvider,
                            hasApiKey: !!newConfig.api[newConfig.api.defaultProvider]?.apiKey,
                            endpoint: newConfig.api[newConfig.api.defaultProvider]?.endpoint
                        });
    
                        vscode.window.showInformationMessage('Configuration saved successfully!');
                    } catch (error) {
                        console.error('Failed to save configuration:', error);
                        vscode.window.showErrorMessage(`Failed to save configuration: ${error.message}`);
                    }
                    break;
            }
        });
    }

    private _getHtmlForWebview(config: any): string {
        return `<!DOCTYPE html>
        <html>
        <head>
            <style>
                body { 
                    padding: 20px; 
                    color: var(--vscode-foreground);
                    font-family: var(--vscode-font-family);
                }
                .form-group { 
                    margin-bottom: 15px; 
                }
                label { 
                    display: block; 
                    margin-bottom: 5px; 
                }
                input, select, textarea { 
                    width: 100%; 
                    padding: 5px;
                    background-color: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                }
                .section { 
                    margin-bottom: 20px; 
                    border-bottom: 1px solid var(--vscode-panel-border); 
                    padding-bottom: 20px; 
                }
                button {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 8px 16px;
                    cursor: pointer;
                }
                button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                .provider-config {
                    margin-left: 20px;
                    padding: 10px;
                    border-left: 2px solid var(--vscode-panel-border);
                }
                .hidden {
                    display: none;
                }
                .checkbox-group {
                    margin: 10px 0;
                }
                .checkbox-label {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }
                .checkbox-label input[type="checkbox"] {
                    width: auto;
                }
            </style>
        </head>
        <body>
            <h2>AI Prompt Optimizer Settings</h2>
            <form id="settingsForm">
                <div class="section">
                    <h3>API Configuration</h3>
                    <div class="form-group">
                        <label>Provider:</label>
                        <select id="provider" name="provider">
                            <option value="openai" ${config.api.defaultProvider === 'openai' ? 'selected' : ''}>OpenAI</option>
                            <option value="openrouter" ${config.api.defaultProvider === 'openrouter' ? 'selected' : ''}>OpenRouter</option>
                            <option value="anthropic" ${config.api.defaultProvider === 'anthropic' ? 'selected' : ''}>Anthropic</option>
                            <option value="custom" ${config.api.defaultProvider === 'custom' ? 'selected' : ''}>Custom</option>
                        </select>
                    </div>

                    <!-- OpenAI Configuration -->
                    <div id="openai-config" class="provider-config ${config.api.defaultProvider === 'openai' ? '' : 'hidden'}">
                        <div class="form-group">
                            <label>OpenAI API Key:</label>
                            <input type="password" id="openaiApiKey" value="${config.api.openai?.apiKey || ''}" />
                        </div>
                        <div class="form-group">
                            <label>Model:</label>
                            <select id="openaiModel">
                                <option value="gpt-4" ${config.api.openai?.model === 'gpt-4' ? 'selected' : ''}>GPT-4</option>
                                <option value="gpt-4-turbo" ${config.api.openai?.model === 'gpt-4-turbo' ? 'selected' : ''}>GPT-4 Turbo</option>
                                <option value="gpt-3.5-turbo" ${config.api.openai?.model === 'gpt-3.5-turbo' ? 'selected' : ''}>GPT-3.5 Turbo</option>
                            </select>
                        </div>
                    </div>

                    <!-- OpenRouter Configuration -->
                    <div id="openrouter-config" class="provider-config ${config.api.defaultProvider === 'openrouter' ? '' : 'hidden'}">
                        <div class="form-group">
                            <label>OpenRouter API Key:</label>
                            <input type="password" id="openrouterApiKey" value="${config.api.openrouter?.apiKey || ''}" />
                        </div>
                        <div class="form-group">
                            <label>Model:</label>
                            <select id="openrouterModel">
                                <option value="openai/gpt-4" ${config.api.openrouter?.model === 'openai/gpt-4' ? 'selected' : ''}>GPT-4</option>
                                <option value="anthropic/claude-2" ${config.api.openrouter?.model === 'anthropic/claude-2' ? 'selected' : ''}>Claude 2</option>
                                <option value="google/palm-2" ${config.api.openrouter?.model === 'google/palm-2' ? 'selected' : ''}>PaLM 2</option>
                            </select>
                        </div>
                    </div>

                    <!-- Anthropic Configuration -->
                    <div id="anthropic-config" class="provider-config ${config.api.defaultProvider === 'anthropic' ? '' : 'hidden'}">
                        <div class="form-group">
                            <label>Anthropic API Key:</label>
                            <input type="password" id="anthropicApiKey" value="${config.api.anthropic?.apiKey || ''}" />
                        </div>
                        <div class="form-group">
                            <label>Model:</label>
                            <select id="anthropicModel">
                                <option value="claude-2" ${config.api.anthropic?.model === 'claude-2' ? 'selected' : ''}>Claude 2</option>
                                <option value="claude-instant" ${config.api.anthropic?.model === 'claude-instant' ? 'selected' : ''}>Claude Instant</option>
                            </select>
                        </div>
                    </div>

                    <!-- Custom Provider Configuration -->
                    <div id="custom-config" class="provider-config ${config.api.defaultProvider === 'custom' ? '' : 'hidden'}">
                        <div class="form-group">
                            <label>API Endpoint URL:</label>
                            <input type="text" id="customApiUrl" value="${config.api.custom?.endpoint || ''}" placeholder="https://api.example.com/v1/chat/completions" />
                        </div>
                        <div class="form-group">
                            <label>API Key:</label>
                            <input type="password" id="customApiKey" value="${config.api.custom?.apiKey || ''}" />
                        </div>
                        <div class="form-group">
                            <label>Model:</label>
                            <input type="text" id="customModel" value="${config.api.custom?.model || ''}" placeholder="model-name" />
                        </div>
                    </div>
                </div>

                <div class="section">
                    <h3>Advanced Settings</h3>
                    <div class="form-group">
                        <label>Max Tokens:</label>
                        <input type="number" id="maxTokens" value="${config.api.maxTokens || 2000}" min="1" max="8000" />
                    </div>
                    <div class="form-group">
                        <label>Temperature:</label>
                        <input type="range" id="temperature" min="0" max="2" step="0.1" value="${config.api.temperature || 0.7}" />
                        <span id="temperatureValue">${config.api.temperature || 0.7}</span>
                    </div>
                </div>

                <div class="section">
                    <h3>Cache Settings</h3>
                    <div class="checkbox-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="cacheEnabled" ${config.cache.enabled ? 'checked' : ''} />
                            Enable Cache
                        </label>
                    </div>
                    <div class="form-group">
                        <label>Cache TTL (minutes):</label>
                        <input type="number" id="cacheTTL" value="${config.cache.ttlMinutes}" min="1" />
                    </div>
                </div>

                <button type="submit">Save Settings</button>
            </form>

            <script>
                const form = document.getElementById('settingsForm');
                const providerSelect = document.getElementById('provider');
                const temperatureInput = document.getElementById('temperature');
                const temperatureValue = document.getElementById('temperatureValue');

                // Update temperature value display
                temperatureInput.addEventListener('input', (e) => {
                    temperatureValue.textContent = e.target.value;
                });

                // Handle provider change
                providerSelect.addEventListener('change', (e) => {
                    // Hide all provider configs
                    document.querySelectorAll('.provider-config').forEach(config => {
                        config.classList.add('hidden');
                    });
                    // Show selected provider config
                    document.getElementById(e.target.value + '-config').classList.remove('hidden');
                });

                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const provider = providerSelect.value;
                    
                    const formData = {
                        api: {
                            defaultProvider: provider,
                            maxTokens: parseInt(document.getElementById('maxTokens').value),
                            temperature: parseFloat(document.getElementById('temperature').value),
                        },
                        cache: {
                            enabled: document.getElementById('cacheEnabled').checked,
                            ttlMinutes: parseInt(document.getElementById('cacheTTL').value),
                        }
                    };

                    // Add provider-specific configuration
                    switch(provider) {
                        case 'openai':
                            formData.api.openai = {
                                apiKey: document.getElementById('openaiApiKey').value,
                                model: document.getElementById('openaiModel').value
                            };
                            break;
                        case 'openrouter':
                            formData.api.openrouter = {
                                apiKey: document.getElementById('openrouterApiKey').value,
                                model: document.getElementById('openrouterModel').value
                            };
                            break;
                        case 'anthropic':
                            formData.api.anthropic = {
                                apiKey: document.getElementById('anthropicApiKey').value,
                                model: document.getElementById('anthropicModel').value
                            };
                            break;
                        case 'custom':
                            formData.api.custom = {
                                endpoint: document.getElementById('customApiUrl').value,
                                apiKey: document.getElementById('customApiKey').value,
                                model: document.getElementById('customModel').value
                            };
                            break;
                    }

                    const vscode = acquireVsCodeApi();
                    vscode.postMessage({
                        type: 'saveConfig',
                        value: formData
                    });
                });
            </script>
        </body>
        </html>`;
    }
}
