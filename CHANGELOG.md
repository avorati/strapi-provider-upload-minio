# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.4](https://github.com/avorati/strapi-provider-upload-minio/compare/v1.4.3...v1.4.4) (2025-11-24)


### Bug Fixes

* remove query parameters from URL when extracting file path ([2e46da4](https://github.com/avorati/strapi-provider-upload-minio/commit/2e46da4df08ecb30db297209e602a799a0078e0b))
* update integration test to use CommonJS require ([6ee0d53](https://github.com/avorati/strapi-provider-upload-minio/commit/6ee0d53cb356037517bf7db687096649245211c9))

## [1.4.3](https://github.com/avorati/strapi-provider-upload-minio/compare/v1.4.2...v1.4.3) (2025-11-24)


### Bug Fixes

* return explicit object literal with bound methods from init ([59d3201](https://github.com/avorati/strapi-provider-upload-minio/commit/59d3201a49f2069cbfe08c25aa962268f5a0e5a8))

## [1.4.2](https://github.com/avorati/strapi-provider-upload-minio/compare/v1.4.1...v1.4.2) (2025-11-24)


### Bug Fixes

* remove ES module export to ensure CommonJS compatibility with Strapi ([74473ba](https://github.com/avorati/strapi-provider-upload-minio/commit/74473ba9f40ea2f114cc5a43a20a873941795beb))

## [1.4.1](https://github.com/avorati/strapi-provider-upload-minio/compare/v1.4.0...v1.4.1) (2025-11-24)


### Bug Fixes

* allow string values for expiry and port config, add commitlint validation ([1da0069](https://github.com/avorati/strapi-provider-upload-minio/commit/1da00693bfc286b1795bb79d84f83a1d815b4d19))

# [1.4.0](https://github.com/avorati/strapi-provider-upload-minio/compare/v1.3.0...v1.4.0) (2025-11-24)


### Bug Fixes

* corrigir exportação do provider para CommonJS e melhorias de segurança ([042edb8](https://github.com/avorati/strapi-provider-upload-minio/commit/042edb89c50aa95b536b1c7caf225def911d065e))


### Features

* improve IPv6 validation and bucket warning logging ([0ef6b4b](https://github.com/avorati/strapi-provider-upload-minio/commit/0ef6b4bbdefddc9bd0e4d762be86d630e685f02a))

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
