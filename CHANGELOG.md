# [1.3.0](https://github.com/avorati/strapi-provider-upload-minio/compare/v1.2.1...v1.3.0) (2025-11-24)


### Bug Fixes

* add authentication and repository URL for semantic-release ([9380e7e](https://github.com/avorati/strapi-provider-upload-minio/commit/9380e7e38f625dcd11412c7f70e487dfe4b5c98c))
* downgrade @semantic-release/github to support Node.js 20 ([fa59b41](https://github.com/avorati/strapi-provider-upload-minio/commit/fa59b41ca9b2ce3fa948ba595185974cbccfae87))
* remove Node.js 20 from CI matrix ([90adf56](https://github.com/avorati/strapi-provider-upload-minio/commit/90adf56951902c8c329c67519f66147f87b06466))


### Features

* improve provider with bucket validation, custom metadata, and better error messages ([e055914](https://github.com/avorati/strapi-provider-upload-minio/commit/e055914d3aff8884c1253994a0a736c46267a2dd))

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Support for multiple regions
- Metadata cache
- Automatic image compression
- CDN integration

## [1.0.0] - 2025-01-XX

### Added
- MinIO provider for Strapi v5
- Public and private file uploads
- Signed URL generation
- Bucket existence validation with warnings (non-blocking)
- Large file streaming support
- Custom metadata configuration (alternativeText, caption, custom metadata)
- Full TypeScript support
- Unit and integration tests
- Complete documentation
- CI/CD pipeline

### Security
- Required configuration validation
- File name sanitization
- Policy-based access control

## [0.1.0-beta.3] - 2025-01-XX

### Added
- Basic provider implementation
- Initial tests
- Preliminary documentation

### Changed
- Improvements to configuration interface
- Upload process optimization

### Fixed
- Edge case upload fixes
- Improved error handling

## [0.1.0-beta.2] - 2025-01-XX

### Added
- Initial support for Strapi v5
- Basic MinIO configuration

### Fixed
- Compatibility issues with Node.js 18+
- TypeScript typing issues

## [0.1.0-beta.1] - 2025-01-XX

### Added
- Initial provider version
- Basic upload and delete features
- Initial project structure
