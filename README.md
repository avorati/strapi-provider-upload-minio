<!-- Logo -->
<p align="center">
  <img src="public/assets/strapi-provider-upload-minio-logo.png" alt="Strapi Provider Upload MinIO Logo" width="180" />
</p>

# Strapi Provider Upload MinIO

[![npm version](https://img.shields.io/npm/v/@avorati/strapi-provider-upload-minio.svg)](https://www.npmjs.com/package/@avorati/strapi-provider-upload-minio)
[![npm downloads](https://img.shields.io/npm/dm/@avorati/strapi-provider-upload-minio.svg)](https://www.npmjs.com/package/@avorati/strapi-provider-upload-minio)

> 📖 [Read in Portuguese](docs/README.pt-BR.md) | [Leia em Português](docs/README.pt-BR.md)

Upload provider for Strapi v5 that allows storing files in MinIO (S3-compatible storage).

## ✨ Features

- ✅ Compatible with Strapi v5
- ✅ Full MinIO support
- ✅ Public and private file uploads
- ✅ Signed URLs for private files
- ✅ Folder configuration support
- ✅ Custom metadata
- ✅ TypeScript support
- ✅ Large file streaming
- ✅ Path sanitization and security validation
- ✅ Bucket existence caching for performance

## 📦 Installation

```bash
npm install @avorati/strapi-provider-upload-minio
# or
yarn add @avorati/strapi-provider-upload-minio
```

### Requirements

- **Node.js**: >= 22.0.0 (see `package.json` engines)
- **Strapi**: >= 5.0.0
- **MinIO**: Any version compatible with S3 API

## ⚙️ Configuration

### 1. Configure the provider in Strapi

Create or edit the `config/plugins.ts` (or `.js`) file:

```typescript
export default {
  upload: {
    config: {
      provider: '@avorati/strapi-provider-upload-minio',
      providerOptions: {
        host: process.env.MINIO_HOST || process.env.MINIO_ENDPOINT || 'localhost',
        port: process.env.MINIO_PORT ? parseInt(process.env.MINIO_PORT) : undefined,
        // If port is not specified, the provider will automatically use the default port based on useSSL (443 for HTTPS, 9000 for HTTP)
        useSSL: process.env.MINIO_USE_SSL === 'true',
        rejectUnauthorized: process.env.MINIO_REJECT_UNAUTHORIZED !== 'false', // default: true (secure)
        accessKey: process.env.MINIO_ACCESS_KEY,
        secretKey: process.env.MINIO_SECRET_KEY,
        bucket: process.env.MINIO_BUCKET || 'strapi-uploads',
        folder: process.env.MINIO_FOLDER || '', // optional
      },
    },
  },
};
```

### 2. Environment variables

Copy the `.env.example` file to `.env` and fill in your actual values:

```bash
cp .env.example .env
```

Add the following variables to your `.env` file:

```env
MINIO_HOST=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=strapi-uploads
MINIO_FOLDER=uploads
MINIO_PRIVATE=false
MINIO_EXPIRY=604800
```

> **Note:** See `.env.example` for a complete template with descriptions of all available options.

## 🚀 Usage

### Basic upload

The provider works automatically with Strapi's upload system. You can upload files via the API or the admin panel.

### Signed URLs for private files

```typescript
// Generate a signed URL valid for 1 hour
const signedUrl = await strapi.plugin('upload').provider.getSignedUrl(file, { 
  expiresIn: 3600 
});
```

### Programmatic upload

```typescript
const file = {
  name: 'example.jpg',
  hash: 'example_hash',
  ext: '.jpg',
  mime: 'image/jpeg',
  size: 12345,
  buffer: fileBuffer, // or stream: fileStream
};

await strapi.plugin('upload').provider.upload(file, { 
  isPrivate: false 
});
```

## 🔧 Configuration options

| Option           | Type   | Required | Description                                 |
|------------------|--------|----------|---------------------------------------------|
| `host` or `endPoint` | string | ✅       | MinIO server endpoint (you can use either one) |
| `port`           | number | ❌       | Server port (default: 9000 for HTTP, 443 for HTTPS when useSSL=true) |
| `useSSL`         | boolean| ❌       | Use HTTPS (default: false)                  |
| `rejectUnauthorized` | boolean| ❌       | Reject unauthorized SSL certificates (default: true). Set to false for self-signed certificates in dev/hmg environments |
| `accessKey`      | string | ✅       | MinIO access key                            |
| `secretKey`      | string | ✅       | MinIO secret key                            |
| `bucket`         | string | ✅       | Bucket name to store files                  |
| `folder`         | string | ❌       | Folder inside the bucket (optional)         |
| `private`        | boolean| ❌       | Enable private file uploads (default: false) |
| `expiry`         | number | ❌       | Signed URL expiry in seconds (default: 604800 = 7 days) | 
| `connectTimeout` | number | ❌       | Connection timeout in milliseconds (default: 60000 = 60 seconds) |
| `requestTimeout` | number | ❌       | Request timeout in milliseconds (optional, for future use) |
| `debug`          | boolean| ❌       | Enable verbose debug logging (default: false) |
| `maxRetries`     | number | ❌       | Maximum number of retries for transient errors (default: 3) |
| `retryDelay`     | number | ❌       | Delay between retries in milliseconds (default: 1000) |
| `keepAlive`      | boolean| ❌       | Enable HTTP keep-alive connections (default: false to avoid proxy/firewall issues) |

## 🐳 Docker Compose - MinIO for development

```yaml
version: '3.8'
services:
  minio:
    image: minio/minio:latest
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data

  strapi:
    build: .
    ports:
      - "1337:1337"
    environment:
      MINIO_HOST: minio
      MINIO_ACCESS_KEY: minioadmin
      MINIO_SECRET_KEY: minioadmin
    depends_on:
      - minio

volumes:
  minio_data:
```

## 🔒 Security

### Private files

By default, files are public. For private uploads:

```typescript
await strapi.plugin('upload').provider.upload(file, { 
  isPrivate: true 
});
```

Private files require signed URLs for access:

```typescript
const signedUrl = await strapi.plugin('upload').provider.getSignedUrl(file);
```

### CORS configuration

Configure CORS in MinIO to allow frontend access:

```bash
mc admin config set myminio api cors_allow_origin="*"
```

### Path Sanitization

The provider automatically sanitizes file paths to prevent path traversal attacks. All uploaded file paths are validated and normalized:

- Paths are sanitized to prevent `../` and other traversal attempts
- Invalid characters and control characters are removed
- Double slashes and mixed path separators are normalized

### Input Validation

The provider validates all configuration inputs:

- **Endpoint**: Must be a valid hostname or IP address (IPv4 or IPv6)
- **Bucket name**: Must follow S3/MinIO naming rules:
  - 3-63 characters long
  - Lowercase letters, numbers, dots (.), and hyphens (-)
  - Must start and end with a letter or number
  - Cannot be formatted as an IP address
- **Credentials**: Cannot be empty after trimming whitespace

## 📋 Limits and Constraints

### Bucket Naming Rules

Bucket names must comply with S3/MinIO naming conventions:

- Length: 3-63 characters
- Characters: lowercase letters (a-z), numbers (0-9), dots (.), hyphens (-)
- Cannot start or end with a dot or hyphen
- Cannot contain consecutive dots (..)
- Cannot be formatted as an IP address (e.g., 192.168.1.1)

### File Path Constraints

- Maximum path length: Determined by MinIO/S3 limits
- Path sanitization: All paths are automatically sanitized
- Forbidden characters: Path traversal sequences (../, ~, absolute paths) are blocked

### Performance Considerations

- **Bucket existence check**: Cached for 5 minutes to reduce overhead
- **Large files**: Supported via streaming (no size limit enforced by provider)
- **Connection pooling**: MinIO client handles connection management

## ⚠️ Error Handling

The provider uses custom error classes for better error handling:

### Error Types

#### ConfigurationError
Thrown when configuration is invalid:
- Missing required fields
- Invalid endpoint format
- Invalid bucket name
- Empty values after trimming

```typescript
try {
  // Provider initialization
} catch (error) {
  if (error instanceof ConfigurationError) {
    console.error('Configuration error:', error.message);
    console.error('Context:', error.context);
  }
}
```

#### UploadError
Thrown when file upload fails:
- Bucket doesn't exist
- Network issues
- Permission errors

```typescript
try {
  await strapi.plugin('upload').provider.upload(file);
} catch (error) {
  if (error instanceof UploadError) {
    console.error('Upload failed:', error.message);
    console.error('Details:', error.context);
  }
}
```

#### DeleteError
Thrown when file deletion fails:
- File not found
- Permission errors

#### SignedUrlError
Thrown when signed URL generation fails:
- Invalid expiry time
- Permission errors
- File not found

#### PathTraversalError
Thrown when path sanitization detects a security threat:
- Path traversal attempts (../)
- Invalid characters in paths

### Error Context

All errors include a `context` property with additional details:

```typescript
{
  message: "Error description",
  context: {
    fileName: "example.jpg",
    bucket: "my-bucket",
    suggestion: "Helpful suggestion"
  }
}
```

## 🛠️ Development

```bash
# Clone repository
git clone https://github.com/avorati/strapi-provider-upload-minio.git
cd strapi-provider-upload-minio

# Install dependencies
npm install

# Build
npm run build

# Development with watch
npm run dev

# Tests
npm test
```

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🤝 Contributing

Contributions are welcome! Please see our [Contributing Guide](docs/CONTRIBUTING.md) for details.

For information about the release process, see [Release Process](docs/RELEASE.md).

## 📞 Support

- 🐛 [Issues](https://github.com/avorati/strapi-provider-upload-minio/issues)
- 💬 [Discussions](https://github.com/avorati/strapi-provider-upload-minio/discussions)
- 📧 Email: your.email@example.com

## 🙏 Acknowledgements

- [Strapi](https://strapi.io/) - Headless CMS framework
- [MinIO](https://min.io/) - High-performance object storage