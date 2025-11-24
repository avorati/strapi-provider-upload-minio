# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.3.0](https://github.com/avorati/strapi-provider-upload-minio/compare/v1.2.1...v1.3.0) - 2025-11-24

### Added
- Bucket validation with warnings (non-blocking)
- Custom metadata configuration support (alternativeText, caption, custom metadata)
- Improved error messages for better debugging

### Fixed
- Add authentication and repository URL for semantic-release
- Downgrade @semantic-release/github to support Node.js 20
- Remove Node.js 20 from CI matrix

### Changed
- Update to Node.js 22 and latest semantic-release packages
- Reorganize project structure and add remaining project files
- Fix provider name in configuration examples

## [1.2.1] - 2025-01-XX

### Fixed
- Provider export issues
- Upload stream handling
- File stream closing
- CI/CD configuration and permissions
- Version check updates
- MinIO container errors in CI

### Changed
- Refactor provider implementation
- Improve overall code quality
- Update tests for version 1.1.0

## [1.2.0] - 2025-01-XX

### Added
- Internationalization (i18n) support
- Package logo
- Improved documentation

### Fixed
- GitHub Actions CI/CD errors
- Yarn configuration updates

## [1.1.1] - 2025-01-XX

### Fixed
- Upload version handling
- Stream processing issues

## [1.0.6] - 2025-01-XX

### Fixed
- Various bug fixes and improvements

## [1.0.0] - 2025-01-XX

### Added
- MinIO provider for Strapi v5
- Public and private file uploads
- Signed URL generation
- Large file streaming support
- Full TypeScript support
- Unit and integration tests
- Complete documentation
- CI/CD pipeline

### Security
- Required configuration validation
- File name sanitization
- Policy-based access control
