// src/config/defaultConfig.ts

export const defaultConfig = {
    api: {
        defaultProvider: 'openai',
        maxTokens: 2000,
        temperature: 0.7,
        openai: {
            endpoint: 'https://api.openai.com/v1/chat/completions',
            apiKey: '',
            model: 'gpt-4'
        },
        openrouter: {
            endpoint: 'https://openrouter.ai/api/v1/chat/completions',
            apiKey: '',
            model: 'openai/gpt-4'
        },
        anthropic: {
            endpoint: 'https://api.anthropic.com/v1/complete',
            apiKey: '',
            model: 'claude-2'
        },
        custom: {
            endpoint: '',
            apiKey: '',
            model: ''
        }
    },
    cache: {
        enabled: true,
        maxEntries: 100,
        ttlMinutes: 60,
        excludePatterns: []
    },
    templates: {
        enabled: true,
        customTemplatesPath: './templates',
        defaultTemplate: 'general',
        autoDetect: true
    },
    context: {
        analysis: {
            enabled: true,
            scanDepth: 2,
            excludeFolders: ['node_modules', 'dist', '.git'],
            includePackageJson: true,
            includeGitInfo: true
        },
        workspace: {
            maxFileScanSize: 1000000,
            fileExtensions: ['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.cpp']
        }
    },
    ui: {
        theme: 'auto',
        maxConversationHistory: 50,
        showLineNumbers: true,
        autoComplete: true,
        suggestions: {
            enabled: true,
            maxSuggestions: 5,
            triggerCharacters: ['@', '/', '#']
        }
    }
};
