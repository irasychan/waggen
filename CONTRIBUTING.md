# Contributing to Waggen

Thank you for your interest in contributing to Waggen! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## How to Contribute

### Reporting Bugs

1. **Check existing issues** - Search the issue tracker to see if the bug has already been reported
2. **Create a new issue** - If not found, create a new issue with:
   - Clear, descriptive title
   - Steps to reproduce the bug
   - Expected vs actual behavior
   - Environment details (OS, Node version, browser)
   - Relevant logs or screenshots

### Suggesting Features

1. **Check existing issues** - Your idea might already be discussed
2. **Create a feature request** - Include:
   - Clear description of the feature
   - Use case / problem it solves
   - Proposed implementation (if any)

### Submitting Pull Requests

#### Setup

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/waggen.git
cd waggen

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium
```

#### Development Workflow

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes**
   - Write clean, readable code
   - Follow existing code style
   - Add comments for complex logic

3. **Test your changes**
   ```bash
   # Run the sample app
   npm run serve-sample

   # Test exploration
   npx ts-node src/index.ts explore --url http://localhost:3000

   # Generate and run tests
   npx ts-node src/index.ts generate-tests -f ./output/graph.json
   cd generated-tests && npx playwright test
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   # or
   git commit -m "fix: resolve bug in exploration"
   ```

   Commit message format:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `refactor:` - Code refactoring
   - `test:` - Adding or updating tests
   - `chore:` - Maintenance tasks

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then open a Pull Request on GitHub.

#### PR Guidelines

- **Clear title** - Describe what the PR does
- **Description** - Explain the changes and why they're needed
- **Link issues** - Reference related issues with `Fixes #123`
- **Small PRs** - Keep changes focused and reviewable
- **Tests** - Add tests for new functionality

## Project Structure

```
waggen/
├── src/
│   ├── index.ts           # CLI entry point
│   ├── types/             # TypeScript interfaces
│   ├── explorer/          # State exploration engine
│   ├── graph/             # Graph data structures
│   └── generator/         # Test generation
├── sample-app/            # Test application
├── output/                # Generated graphs (gitignored)
└── generated-tests/       # Generated tests (gitignored)
```

## Development Guidelines

### Code Style

- Use TypeScript for all source files
- Use meaningful variable and function names
- Keep functions small and focused
- Add JSDoc comments for public APIs

### Adding New Features

1. **Element Types** - Add to `ActionDiscovery.ts`
2. **Action Types** - Update types and `Explorer.executeAction()`
3. **Output Formats** - Add to `Serializer.ts`
4. **CLI Commands** - Add to `src/index.ts`

### Testing

- Test with the sample todo app
- Try on other web applications
- Verify generated tests pass

## Getting Help

- Open an issue for questions
- Tag with `question` label
- Check existing documentation

## Recognition

Contributors will be recognized in:
- GitHub contributors list
- Release notes for significant contributions

Thank you for contributing!
