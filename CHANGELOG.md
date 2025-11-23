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