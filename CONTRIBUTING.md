# Contributing to Trellis

Thanks for your interest in contributing to Trellis! This document provides guidelines for contributing to the project.

## Ways to Contribute

### Reporting Bugs

Before creating a bug report, please check [existing issues](https://github.com/mindfold-ai/Trellis/issues) to avoid duplicates.

When reporting a bug, include:
- Trellis version (`trellis --version`)
- Node.js version (`node --version`)
- Operating system
- Steps to reproduce
- Expected vs actual behavior
- Relevant logs or screenshots

### Suggesting Features

Feature requests are welcome! Please open an issue with:
- Clear description of the feature
- Use case / problem it solves
- Any implementation ideas (optional)

### Improving Documentation

Documentation improvements are always appreciated:
- Fix typos or unclear explanations
- Add examples
- Improve README or guide docs

### Contributing Code

Code contributions are welcome for:
- Bug fixes
- New features (please discuss in an issue first)
- Performance improvements
- Test coverage

## Development Setup

### Prerequisites

- Node.js 18.0.0+
- pnpm
- uv (creates the checkout's Python 3.9 development environment)
- Bash (for scripts)

### Getting Started

1. **Fork the repository** on GitHub

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/Trellis.git
   cd Trellis
   ```

3. **Install dependencies**
   ```bash
   pnpm install
   uv sync --locked
   uv run python --version
   ```

   `.python-version` pins this checkout to Python 3.9 so local checks use the
   minimum supported interpreter. `uv sync` creates `.venv` and downloads that
   interpreter if needed. The Python scripts use only the standard library;
   `pyproject.toml` does not define a distributable package. TypeScript tools
   and basedpyright remain managed by pnpm.

4. **Build the project**
   ```bash
   pnpm build
   ```

### Running Checks

```bash
pnpm lint                                        # ESLint for TypeScript
pnpm --filter @mindfoldhq/trellis lint:py          # Python type checking
pnpm typecheck                                   # TypeScript type checking
uv run pnpm test                                 # Tests with Python 3.9 on PATH
```

> **Note:** Pre-commit hooks format staged TypeScript files and run the full test suite. Use `uv run git commit ...` to run the hook with Python 3.9.

Run workflow scripts as `uv run python .trellis/scripts/task.py ...` on every
platform. `uv run` selects `.venv`; plain `python` or `pnpm test` outside an
activated environment can still select a system interpreter. The
`pythonVersion` in `pyrightconfig.json` controls static checking only.

## Project Structure

```
Trellis/
├── src/                    # TypeScript source code
│   ├── cli/                # CLI entry point
│   ├── commands/           # CLI commands (init, update)
│   ├── configurators/      # Template application logic
│   ├── templates/          # Templates copied to user projects ←
│   └── utils/              # Utility functions
├── .claude/                # Claude Code config (project's own) ←
│   ├── agents/             # Agent definitions
│   ├── commands/           # Slash commands
│   └── hooks/              # Python hook scripts
├── .trellis/               # Trellis workflow (project's own) ←
│   ├── scripts/            # Bash scripts
│   └── spec/               # Spec file templates
└── docs/                   # Documentation
```

> **Important:** When modifying `.claude/`, `.trellis/`, or `.cursor/`, check if the same changes need to be applied to `src/templates/`. The project uses its own config files, but templates are what gets installed to user projects.

## Commit Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

**Examples:**
```
feat(cli): add --dry-run flag to init command
fix(hooks): resolve context injection for nested tasks
docs(readme): update quick start instructions
```

## Pull Request Process

1. **Create a branch** from `main`
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes** and commit following the commit guidelines

3. **Ensure quality checks pass**
   ```bash
   pnpm lint && pnpm typecheck
   ```

4. **Push to your fork**
   ```bash
   git push origin feat/your-feature-name
   ```

5. **Open a Pull Request** against `main` branch
   - Provide a clear description of changes
   - Reference any related issues
   - Include screenshots for UI changes

6. **Address review feedback** if requested

## Thank You

Every contribution helps make Trellis better. We appreciate your time and effort!
