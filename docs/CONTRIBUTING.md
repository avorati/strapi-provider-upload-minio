# Contributing

Thank you for your interest in contributing to this project!

## Commit Message Format

This project uses [Conventional Commits](https://www.conventionalcommits.org/) to automatically generate releases and changelogs.

### Commit Types

The following commit types will trigger automatic version bumps:

#### Major Version (X.0.0) - Breaking Changes
- **BREAKING CHANGE**: Any commit with `BREAKING CHANGE:` in the footer or `!` after the type/scope
- Example: `feat!: remove deprecated API` or `feat(api)!: remove deprecated endpoint`

#### Minor Version (0.X.0) - New Features
- **feat**: A new feature
- Example: `feat: add support for custom expiry in signed URLs`

#### Patch Version (0.0.X) - Bug Fixes
- **fix**: A bug fix
- Example: `fix: correct URL building for HTTPS endpoints`
- **perf**: A performance improvement
- Example: `perf: optimize file upload streaming`
- **refactor**: A code refactor that doesn't change functionality
- Example: `refactor: extract URL builder to separate utility`

### Commit Types That Don't Trigger Releases

These commit types will **not** trigger a release:

- **docs**: Documentation only changes
  - Example: `docs: update README with new configuration options`
- **style**: Code style changes (formatting, missing semicolons, etc.)
  - Example: `style: fix code formatting`
- **chore**: Maintenance tasks
  - Example: `chore: update dependencies`
- **test**: Adding or updating tests
  - Example: `test: add integration tests for private files`
- **build**: Build system changes
  - Example: `build: update TypeScript configuration`
- **ci**: CI/CD changes
  - Example: `ci: add semantic-release workflow`

### Commit Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Examples

**Feature (Minor Release):**
```
feat: add support for custom expiry in signed URLs

Allows users to specify custom expiry time when generating signed URLs.
This enables more flexible access control for private files.
```

**Bug Fix (Patch Release):**
```
fix(url-builder): correct port handling for HTTPS

Fixed issue where port 80 was incorrectly omitted for HTTPS connections.
Now only port 443 is omitted for HTTPS, and port 80 for HTTP.
```

**Breaking Change (Major Release):**
```
feat!: refactor provider configuration

BREAKING CHANGE: Configuration options have been restructured.
The `region` option has been removed. Use `endPoint` instead.

Migration guide:
- Remove `region` from your configuration
- Ensure `endPoint` is properly configured
```

**No Release (Documentation):**
```
docs: update README with environment variables

Added section explaining how to configure environment variables
and use the .env.example file.
```

### Scope (Optional)

The scope should be the area of the codebase affected:

- `provider`: Changes to the main provider
- `config`: Configuration-related changes
- `url-builder`: URL building utilities
- `path-builder`: Path building utilities
- `validator`: Configuration validation
- `test`: Test-related changes
- `ci`: CI/CD changes
- `docs`: Documentation changes

### Multiple Changes in One Commit

If your commit includes multiple types of changes, use the most significant one:

- If you add a feature and fix a bug: use `feat` (minor release)
- If you fix a bug and update docs: use `fix` (patch release)
- If you add a feature with a breaking change: use `feat!` (major release)

### Tips

1. **Be descriptive**: Write clear commit messages that explain what and why
2. **Use present tense**: "add feature" not "added feature"
3. **Keep it concise**: Subject line should be under 50 characters
4. **Reference issues**: Use `Closes #123` or `Fixes #456` in the footer
5. **Test before committing**: Ensure all tests pass before pushing

### Automatic Release Process

When you push commits to `main`:

1. Semantic Release analyzes your commits
2. Determines the next version based on commit types
3. Updates `CHANGELOG.md` with the changes
4. Updates `package.json` version
5. Creates a Git tag
6. Publishes to NPM
7. Creates a GitHub Release with changelog

### Skipping CI

If you need to skip CI (e.g., for documentation-only commits):

```
docs: update README [skip ci]
```

This will prevent the release workflow from running.
