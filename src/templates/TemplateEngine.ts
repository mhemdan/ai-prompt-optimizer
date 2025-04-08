// src/templates/TemplateEngine.ts

interface PromptTemplate {
    id: string;
    name: string;
    description: string;
    template: string;
    variables: string[];
    context: {
        language?: string;
        framework?: string;
        pattern?: string;
    };
}

export class TemplateEngine {
    private templates: Map<string, PromptTemplate>;

    constructor() {
        this.templates = new Map();
        this.initializeDefaultTemplates();
    }

    private initializeDefaultTemplates() {
        this.addTemplate({
            id: 'react-component',
            name: 'React Component',
            description: 'Create a React component with specific features',
            template: `Create a React component that implements:
- Component name: {{componentName}}
- Features: {{features}}
- State management: {{stateManagement}}
- Props interface: {{propsInterface}}
Consider best practices for:
- Performance optimization
- Error handling
- Accessibility
- Testing approach`,
            variables: ['componentName', 'features', 'stateManagement', 'propsInterface'],
            context: {
                language: 'typescript',
                framework: 'react'
            }
        });

        // Add more default templates...
    }

    public getTemplate(id: string): PromptTemplate | undefined {
        return this.templates.get(id);
    }

    public addTemplate(template: PromptTemplate) {
        this.templates.set(template.id, template);
    }

    public applyTemplate(templateId: string, variables: Record<string, string>): string {
        const template = this.getTemplate(templateId);
        if (!template) {
            throw new Error(`Template ${templateId} not found`);
        }

        let result = template.template;
        for (const [key, value] of Object.entries(variables)) {
            result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }
        return result;
    }
}
