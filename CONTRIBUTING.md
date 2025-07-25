# Contribution Guide

Thank you for your interest in contributing to the Strapi MinIO Provider! 🎉

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
- [Environment Setup](#environment-setup)
- [Running Tests](#running-tests)
- [Submitting Pull Requests](#submitting-pull-requests)
- [Code Conventions](#code-conventions)
- [Versioning](#versioning)

## 📝 Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/). By participating, you agree to abide by this code.

## 🤝 How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in the [Issues](https://github.com/seu-usuario/strapi-provider-upload-minio/issues)
2. If not found, create a new issue with:
   - Clear and descriptive title
   - Detailed description of the problem
   - Steps to reproduce
   - Versions of Strapi, Node.js, and MinIO
   - Screenshots/logs when applicable

### Suggesting Improvements

1. Open an issue describing:
   - The desired feature
   - Why it would be useful
   - How it should work
   - Usage examples

### Contributing Code

1. Fork the repository
2. Create a branch for your feature (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run the tests
5. Commit your changes
6. Push to the branch
7. Open a Pull Request

## 🛠️ Environment Setup

### Prerequisites

- Node.js 18+
- npm 6+
- Docker (for local MinIO)

### Installation

```bash
# Clone the repository
git clone https://github.com/seu-usuario/strapi-provider-upload-minio.git
cd strapi-provider-upload-minio

# Install dependencies
npm install

# Set up local MinIO with Docker
docker run -d \
  -p 9000:9000 \
  -p 9001:9001 \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin" \
  minio/minio server /data --console-address ":9001"
```

### Environment Configuration

Create a `.env` file at the project root:

```env
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=test-bucket
```

## 🧪 Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Linting
npm run lint

# Build
npm run build
```

## 📝 Submitting Pull Requests

### Before Submitting

- [ ] All tests passing
- [ ] Code follows conventions
- [ ] Documentation updated
- [ ] Commits follow conventional standard

### PR Template

```markdown
## 📝 Description

Brief description of the changes made.

## 🔧 Type of Change

- [ ] Bug fix (fixes a problem)
- [ ] New feature (adds functionality)
- [ ] Breaking change (breaking compatibility)
- [ ] Documentation (documentation only)

## ✅ Checklist

- [ ] Tests passing
- [ ] Linting without errors
- [ ] Documentation updated
- [ ] CHANGELOG.md updated (if necessary)

## 🧪 How to Test

Instructions to test the changes...
```

## 📏 Code Conventions

### TypeScript

- Use TypeScript for all code
- Define explicit types when necessary
- Avoid `any`, prefer specific types

### Formatting

```bash
# Automatic formatting
npm run format

# Check formatting
npm run format:check
```

### Naming

- **Variables/Functions**: camelCase (`fileName`, `uploadFile`)
- **Classes/Interfaces**: PascalCase (`MinIOProvider`, `StrapiFile`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_REGION`)
- **Files**: kebab-case (`minio-provider.ts`)

### Commits

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Examples
feat: add support for custom metadata
fix: resolve bucket creation error
docs: update installation guide
refactor: improve error handling
test: add upload integration tests
```

### File Structure

```
src/
├── __tests__/          # Tests
├── types/              # Type definitions
├── utils/              # Utilities
├── index.ts            # Main provider
└── constants.ts        # Constants
```

## 📦 Versioning

We use [Semantic Versioning](https://semver.org/):

- **PATCH** (1.0.1): Bug fixes
- **MINOR** (1.1.0): New features (compatible)
- **MAJOR** (2.0.0): Breaking changes

## 🚀 Release Process

1. Changes are merged into `main`
2. CI runs tests and build
3. Semantic Release automatically:
   - Analyzes commits
   - Generates CHANGELOG
   - Creates tag/release
   - Publishes to npm

## 📚 Useful Resources

- [Strapi Documentation](https://docs.strapi.io/)
- [MinIO JavaScript SDK](https://docs.min.io/docs/javascript-client-api-reference.html)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)

## ❓ Questions?

- Open a [Discussion](https://github.com/seu-usuario/strapi-provider-upload-minio/discussions)
- Contact: your.email@example.com

Thank you for your contribution! 🙏