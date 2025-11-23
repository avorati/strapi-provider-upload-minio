# Release Process

This project uses **Semantic Release** for automated versioning and publishing.

## How It Works

### 1. Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```bash
<type>(<scope>): <subject>

<body>

<footer>
```

### 2. Version Bumping

| Commit Type | Version Bump | Example |
|------------|--------------|---------|
| `feat:` | **Minor** (0.X.0) | `feat: add custom expiry support` |
| `fix:`, `perf:`, `refactor:` | **Patch** (0.0.X) | `fix: correct URL building` |
| `feat!:` or `BREAKING CHANGE:` | **Major** (X.0.0) | `feat!: refactor API` |
| `docs:`, `style:`, `chore:`, `test:`, `build:`, `ci:` | **None** | `docs: update README` |

### 3. Automatic Process

When you push to `main`:

1. ✅ Tests run
2. ✅ Build completes
3. ✅ Semantic Release analyzes commits
4. ✅ Determines next version
5. ✅ Updates `CHANGELOG.md`
6. ✅ Updates `package.json` version
7. ✅ Creates Git tag
8. ✅ Publishes to NPM
9. ✅ Creates GitHub Release with changelog

## Examples

### Minor Release (0.X.0)

```bash
git commit -m "feat: add support for custom expiry in signed URLs"
git push origin main
# → Version: 1.2.1 → 1.3.0
```

### Patch Release (0.0.X)

```bash
git commit -m "fix: correct port handling for HTTPS endpoints"
git push origin main
# → Version: 1.2.1 → 1.2.2
```

### Major Release (X.0.0)

```bash
git commit -m "feat!: refactor provider configuration

BREAKING CHANGE: Configuration options restructured.
Remove 'region' option, use 'endPoint' instead."
git push origin main
# → Version: 1.2.1 → 2.0.0
```

### No Release

```bash
git commit -m "docs: update README with new examples"
git push origin main
# → No release, no version bump
```

## Skipping CI

To skip the release process:

```bash
git commit -m "docs: update README [skip ci]"
```

## Manual Release

If you need to manually trigger a release (not recommended):

```bash
yarn semantic-release --dry-run  # Test without publishing
yarn semantic-release             # Actually release
```

## Secrets Required

Make sure these secrets are configured in GitHub:

- `NPM_TOKEN` - NPM authentication token
- `GITHUB_TOKEN` - Automatically provided by GitHub Actions

## Troubleshooting

### Release not triggered?

- Check commit message format
- Ensure you're pushing to `main` branch
- Verify secrets are configured
- Check GitHub Actions logs

### Wrong version?

- Review commit messages since last release
- Check `.releaserc.json` configuration
- Verify release rules match your commits

