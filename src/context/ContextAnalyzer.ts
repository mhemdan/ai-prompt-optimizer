// src/context/ContextAnalyzer.ts

import * as vscode from 'vscode';

interface ProjectContext {
    language: string;
    framework: string[];
    dependencies: Record<string, string>;
    workspacePatterns: string[];
}

export class ContextAnalyzer {
    private context: ProjectContext;

    constructor() {
        this.context = {
            language: '',
            framework: [],
            dependencies: {},
            workspacePatterns: []
        };
    }

    public async analyzeWorkspace(): Promise<ProjectContext> {
        await this.detectLanguage();
        await this.analyzeDependencies();
        await this.detectPatterns();
        return this.context;
    }

    private async detectLanguage() {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            this.context.language = activeEditor.document.languageId;
        }
    }

    private async analyzeDependencies() {
        // Read package.json if exists
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
            const packageJsonPath = vscode.Uri.joinPath(workspaceFolders[0].uri, 'package.json');
            try {
                const packageJsonContent = await vscode.workspace.fs.readFile(packageJsonPath);
                const packageJson = JSON.parse(packageJsonContent.toString());
                this.context.dependencies = {
                    ...packageJson.dependencies,
                    ...packageJson.devDependencies
                };
                
                // Detect frameworks
                if (this.context.dependencies['react']) {
                    this.context.framework.push('react');
                }
                if (this.context.dependencies['vue']) {
                    this.context.framework.push('vue');
                }
                // Add more framework detection...
            } catch (error) {
                console.log('No package.json found or unable to parse');
            }
        }
    }

    private async detectPatterns() {
        // Analyze workspace files for common patterns
        // This is a simplified example
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
            const files = await vscode.workspace.findFiles('**/*.{ts,js,tsx,jsx}');
            // Analyze files for patterns...
        }
    }
}
