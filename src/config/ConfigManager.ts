// src/config/ConfigManager.ts

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { defaultConfig } from './defaultConfig';

export interface Config {
    api: {
        defaultProvider: string;
        maxTokens: number;
        temperature: number;
        openai: ProviderConfig;
        openrouter: ProviderConfig;
        anthropic: ProviderConfig;
        custom: ProviderConfig;
    };
    cache: {
        enabled: boolean;
        maxEntries: number;
        ttlMinutes: number;
        excludePatterns: string[];
    };
    templates: {
        enabled: boolean;
        customTemplatesPath: string;
        defaultTemplate: string;
        autoDetect: boolean;
    };
    context: {
        analysis: {
            enabled: boolean;
            scanDepth: number;
            excludeFolders: string[];
            includePackageJson: boolean;
            includeGitInfo: boolean;
        };
        workspace: {
            maxFileScanSize: number;
            fileExtensions: string[];
        };
    };
    ui: {
        theme: 'light' | 'dark' | 'auto';
        maxConversationHistory: number;
        showLineNumbers: boolean;
        autoComplete: boolean;
        suggestions: {
            enabled: boolean;
            maxSuggestions: number;
            triggerCharacters: string[];
        };
    };
}

export class ConfigManager {
    private static instance: ConfigManager;
    private config: Config;
    private readonly configPath: string;

    private constructor(context: vscode.ExtensionContext) {
        this.configPath = path.join(context.globalStorageUri.fsPath, 'config.json');
        this.config = this.loadConfig();
    }

    public static getInstance(context: vscode.ExtensionContext): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager(context);
        }
        return ConfigManager.instance;
    }

    private loadConfig(): Config {
        try {
            if (fs.existsSync(this.configPath)) {
                const userConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
                return this.mergeConfigs(defaultConfig, userConfig);
            }
            // If no config file exists, create one with default settings
            this.saveConfig(defaultConfig);
            return defaultConfig;
        } catch (error) {
            console.error('Error loading config:', error);
            return defaultConfig;
        }
    }

    private mergeConfigs(defaultConfig: Config, userConfig: Partial<Config>): Config {
        const merged = { ...defaultConfig };

        // Merge API configuration
        if (userConfig.api) {
            merged.api = {
                ...defaultConfig.api,
                ...userConfig.api,
                openai: { ...defaultConfig.api.openai, ...userConfig.api?.openai },
                openrouter: { ...defaultConfig.api.openrouter, ...userConfig.api?.openrouter },
                anthropic: { ...defaultConfig.api.anthropic, ...userConfig.api?.anthropic },
                custom: { ...defaultConfig.api.custom, ...userConfig.api?.custom }
            };
        }

        // Merge cache configuration
        if (userConfig.cache) {
            merged.cache = {
                ...defaultConfig.cache,
                ...userConfig.cache
            };
        }

        // Merge templates configuration
        if (userConfig.templates) {
            merged.templates = {
                ...defaultConfig.templates,
                ...userConfig.templates
            };
        }

        // Merge context configuration
        if (userConfig.context) {
            merged.context = {
                analysis: {
                    ...defaultConfig.context.analysis,
                    ...userConfig.context?.analysis
                },
                workspace: {
                    ...defaultConfig.context.workspace,
                    ...userConfig.context?.workspace
                }
            };
        }

        // Merge UI configuration
        if (userConfig.ui) {
            merged.ui = {
                ...defaultConfig.ui,
                ...userConfig.ui,
                suggestions: {
                    ...defaultConfig.ui.suggestions,
                    ...userConfig.ui?.suggestions
                }
            };
        }

        return merged;
    }

    public async updateConfig(newConfig: Partial<Config>): Promise<void> {
        this.config = this.mergeConfigs(this.config, newConfig);
        await this.saveConfig(this.config);
    }

    private async saveConfig(config: Config): Promise<void> {
        try {
            const configDir = path.dirname(this.configPath);
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }
            fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
        } catch (error) {
            console.error('Error saving config:', error);
            throw error;
        }
    }

    public getConfig(): Config {
        return this.config;
    }

    public get<K extends keyof Config>(key: K): Config[K] {
        return this.config[key];
    }

    public async resetToDefaults(): Promise<void> {
        this.config = defaultConfig;
        await this.saveConfig(this.config);
    }

    public validateConfiguration(): string[] {
        const errors: string[] = [];
        const provider = this.config.api.defaultProvider;
        const providerConfig = this.config.api[provider as keyof typeof this.config.api];

        if (!providerConfig) {
            errors.push(`Selected provider ${provider} is not properly configured`);
        } else {
            if (!providerConfig.endpoint) {
                errors.push(`API endpoint not configured for ${provider}`);
            }
            if (!providerConfig.apiKey) {
                errors.push(`API key not configured for ${provider}`);
            }
            if (!providerConfig.model) {
                errors.push(`Model not selected for ${provider}`);
            }
        }

        return errors;
    }

    public getApiEndpoint(): string {
        const provider = this.config.api.defaultProvider;
        const providerConfig = this.config.api[provider as keyof typeof this.config.api];
        return providerConfig?.endpoint || '';
    }
}
