# Contributing to AI Prompt Optimizer

Thank you for your interest in contributing to **AI Prompt Optimizer**! We welcome contributions from the community to enhance this VS Code extension, which helps developers craft optimized prompts for AI coding tools. Whether you're fixing bugs, adding features, or improving documentation — your efforts are greatly appreciated.

This guide outlines the process for contributing to the project. Please read it carefully to ensure a smooth collaboration experience.

---

## 🚀 How to Contribute

### 🐛 Reporting Issues

- Check the [GitHub Issues](https://github.com/yourusername/ai-prompt-optimizer/issues) page to see if your issue has already been reported.
- If not, create a new issue with:
  - A clear, descriptive title.
  - A detailed description of the problem or feature request, including steps to reproduce (if applicable).
  - Screenshots or logs, if relevant.
  - Your environment details (e.g., VS Code version, OS).

### 💡 Suggesting Enhancements

- Use the issue tracker to propose new features or improvements.
- Provide a use case or justification for why the enhancement would benefit users.
- Tag your issue with the `enhancement` label.

### 📦 Submitting Pull Requests

1. **Fork the Repository**  
   - Fork the repo on [GitHub](https://github.com/yourusername/ai-prompt-optimizer).  
   - Clone your fork locally:
     ```bash
     git clone https://github.com/yourusername/ai-prompt-optimizer.git
     cd ai-prompt-optimizer
     ```

2. **Set Up Your Environment**  
   - See the [Development Setup](#development-setup) section for details.

3. **Create a Branch**  
   - Use a descriptive branch name (e.g., `feature/add-template-support`, `fix/api-error-handling`):
     ```bash
     git checkout -b your-branch-name
     ```

4. **Make Changes**  
   - Follow the [Coding Guidelines](#coding-guidelines).
   - Keep changes focused and atomic (one feature or fix per PR).

5. **Test Your Changes**  
   - Run lint checks:
     ```bash
     npm run lint
     ```
   - Launch the extension in a dev window:
     - Press `F5` in VS Code.

6. **Commit Your Changes**  
   - Use concise, descriptive commit messages (e.g., "Add support for custom templates in TemplateEngine").
   - Reference issues when applicable (e.g., "Fixes #123").

7. **Push and Open a Pull Request**  
   - Push your branch:
     ```bash
     git push origin your-branch-name
     ```
   - Open a PR on the main repo, linking relevant issues (e.g., "Resolves #123").
   - Clearly describe the purpose and testing of your changes.

8. **Review Process**  
   - Expect feedback from maintainers and be responsive.
   - PRs must pass linting and basic functionality tests before merging.

---

## 🛠 Development Setup

To contribute code, you’ll need to set up the project locally.

### 🔧 Prerequisites

- **Node.js**: v20.x or higher – [nodejs.org](https://nodejs.org/)
- **npm**: Comes with Node.js – verify with `npm -v`
- **VS Code**: v1.87.0 or higher – [code.visualstudio.com](https://code.visualstudio.com/)
- **Git**: [git-scm.com](https://git-scm.com/)

### 📥 Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/yourusername/ai-prompt-optimizer.git
   cd ai-prompt-optimizer
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Build the Project**:
   ```bash
   npm run compile
   ```
   Or for live updates:
   ```bash
   npm run watch
   ```

4. **Run the Extension**:
   - Open the folder in VS Code.
   - Press `F5` to launch a new VS Code window with the extension loaded.
   - Look for the light bulb icon 💡 in the Activity Bar to test the extension.

5. **Debugging**:
   - Set breakpoints in `src/extension.ts` or other files.
   - Use the Debug Console to inspect logs.

### ✅ Testing

- Run linting:
  ```bash
  npm run lint
  ```
- Add or update tests in `src/test/`, then run:
  ```bash
  npm run test
  ```
- Ensure all changes maintain backward compatibility.

---

## 🧑‍💻 Coding Guidelines

- **Language**: TypeScript (`.ts` files only).
- **Style**:
  - Follow ESLint rules from `eslint.config.mjs`.
  - Use 2-space indentation, `camelCase` for variables, `PascalCase` for types/classes.
- **Structure**:
  - Place new features under the appropriate `src/` folder (e.g., `src/templates/`).
  - Update `src/extension.ts` if you add new commands or providers.
- **Documentation**:
  - Comment complex logic.
  - Update the README or relevant docs if behavior or usage changes.
- **Dependencies**:
  - Avoid new dependencies unless absolutely necessary. Discuss via issue first.

---

## 🤝 Code of Conduct

We expect all contributors to treat each other with respect and professionalism. Harassment, discrimination, or inappropriate behavior will not be tolerated.

---

## 💬 Getting Help

- **Questions**: Open an issue with the `question` label or [email us](mailto:your.email@example.com).
- **Discussions**: Participate on [GitHub Discussions](https://github.com/yourusername/ai-prompt-optimizer/discussions) (if enabled).
- **Docs**: Refer to the [README](README.md) and inline code comments.

---

## 🙏 Acknowledgments

Every contribution helps make **AI Prompt Optimizer** better.  
**Thank you for your time and effort!**

_Last Updated: April 9, 2025_
