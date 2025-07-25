# 🚀 Deployment Guide

This guide contains instructions for publishing the MinIO provider to the Strapi marketplace and npm.

## 📦 Preparation for Publishing

### 1. Pre-Publishing Checks

```bash
# Check if all tests pass
npm test

# Check linting
npm run lint

# Build the project
npm run build

# Check package structure
npm pack --dry-run
```

### 2. package.json Configuration

Make sure the information is correct:

```json
{
  "name": "@strapi-community/upload-minio",
  "version": "1.0.0",
  "description": "MinIO provider for Strapi Upload",
  "keywords": [
    "strapi",
    "upload",
    "minio",
    "s3",
    "storage",
    "provider"
  ],
  "repository": {
    "type": "git",
    "url": "git+https://github.com/seu-usuario/strapi-provider-upload-minio.git"
  },
  "homepage": "https://github.com/seu-usuario/strapi-provider-upload-minio#readme",
  "strapi": {
    "displayName": "MinIO",
    "description": "Upload files to MinIO S3-compatible storage",
    "kind": "provider",
    "name": "minio"
  }
}
```

## 📋 Quality Checklist

- [ ] **Complete documentation**: Detailed README with examples
- [ ] **Comprehensive tests**: Coverage > 80%
- [ ] **TypeScript**: Complete and exported types
- [ ] **Configuration**: Validation of required parameters
- [ ] **Error handling**: Clear and useful messages
- [ ] **Performance**: Optimized for large files
- [ ] **Security**: Input and output validations
- [ ] **Compatibility**: Tested with different Node.js versions

## 🌐 Publishing to NPM

### 1. Set up NPM Account

```bash
# Login to npm
npm login

# Check logged in user
npm whoami
```

### 2. Configure Scoped Package

```bash
# For organizations
npm config set @strapi-community:registry https://registry.npmjs.org/
```

### 3. Publish

```bash
# First publish
npm publish --access public

# For updates (using semantic-release)
git commit -m "feat: add new feature"
git push origin main
```

## 📱 Submitting to Strapi Market

### 1. Prepare Submission

Strapi Market requires some specific files:

```bash
# Required structure
├── README.md          # Complete documentation
├── package.json       # Configuration with "strapi" field
├── CHANGELOG.md       # Version history
├── assets/
│   ├── logo.png       # 512x512px logo
│   ├── screenshot1.png
│   └── screenshot2.png
```

### 2. Logo and Screenshots

- **Logo**: 512x512px, transparent background, PNG format
- **Screenshots**: Showing configuration and usage
- **Banner** (optional): 1200x400px for highlight

### 3. Market Metadata

```json
{
  "strapi": {
    "displayName": "MinIO Storage Provider",
    "description": "Upload files to MinIO S3-compatible object storage with advanced features like signed URLs and automatic bucket management",
    "kind": "provider",
    "name": "minio",
    "tags": ["storage", "s3", "minio", "upload", "provider"],
    "category": "Storage",
    "screenshots": [
      "https://your-domain.com/screenshot1.png",
      "https://your-domain.com/screenshot2.png"
    ],
    "links": {
      "npm": "https://www.npmjs.com/package/@strapi-community/upload-minio",
      "github": "https://github.com/seu-usuario/strapi-provider-upload-minio",
      "documentation": "https://github.com/seu-usuario/strapi-provider-upload-minio#readme"
    }
  }
}
```

### 4. Submit to Market

1. Go to [Strapi Market](https://market.strapi.io/submit-plugin)
2. Fill out the submission form
3. Provide:
   - GitHub repository URL
   - npm package URL
   - Detailed description
   - Screenshots/demos
   - Contact information

### 5. Approval Criteria

- **Functionality**: Provider works as documented
- **Quality**: Clean, well-tested code
- **Documentation**: Clear and complete README
- **Compatibility**: Works with Strapi v5
- **Maintenance**: Timely response to issues

## 🔄 Automatic Release Process

### 1. Set up Semantic Release

```json
{
  "scripts": {
    "semantic-release": "semantic-release"
  },
  "devDependencies": {
    "@semantic-release/changelog": "^6.0.0",
    "@semantic-release/commit-analyzer": "^11.0.0",
    "@semantic-release/git": "^10.0.0",
    "@semantic-release/github": "^9.0.0",
    "@semantic-release/npm": "^11.0.0",
    "@semantic-release/release-notes-generator": "^12.0.0",
    "semantic-release": "^22.0.0"
  }
}
```

### 2. Configure GitHub Secrets

In the GitHub repository, add secrets:
- `NPM_TOKEN`: npm token for publishing
- `GITHUB_TOKEN`: Already available automatically

### 3. Conventional Commits

```bash
# Patch release (1.0.1)
git commit -m "fix: resolve upload timeout issue"

# Minor release (1.1.0)
git commit -m "feat: add support for custom metadata"

# Major release (2.0.0)
git commit -m "feat!: change configuration structure"
```

## 📊 Post-Publishing Monitoring

### 1. NPM Metrics

- Monthly downloads
- Most used versions
- Dependents

### 2. GitHub Analytics

- Stars and forks
- Open/closed issues
- Pull requests
- Community health

### 3. Strapi Market

- Views and downloads
- User reviews
- Rating

## 🛠️ Continuous Maintenance

### 1. Regular Updates

- Compatibility with new Strapi versions
- Security updates
- Performance improvements

### 2. Community Support

- Response to issues within 48h
- Pull request reviews
- Updated documentation

### 3. Roadmap

- New features based on feedback
- Community-suggested improvements
- Integration with other tools

## 📋 Useful Templates

### Issue Template

```markdown
---
name: Bug Report
about: Create a bug report
title: ''
labels: 'bug'
assignees: ''
---

**Bug Description**
Clear description of the problem.

**To Reproduce**
Steps to reproduce:
1. ...
2. ...

**Expected Behavior**
What should happen.

**Environment:**
- Node.js: [version]
- Strapi: [version]
- Provider: [version]
- MinIO: [version]
```

### PR Template

```markdown
## 📝 Description
Brief description of the changes.

## 🔗 Related Issues
Fixes #123

## 🧪 Tests
- [ ] Tests added/updated
- [ ] All tests passing

## 📋 Checklist
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] CHANGELOG updated
```

## 🎯 Next Steps

1. **Publish initial version** on npm
2. **Submit to Strapi Market**
3. **Promote in the community** (Discord, Forums)
4. **Collect feedback** from early users
5. **Iterate and improve** based on feedback

---

**Success! 🎉** Your provider is ready to be used by the Strapi community!