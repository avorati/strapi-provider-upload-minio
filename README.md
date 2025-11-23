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

## 📦 Installation

```bash
npm install @avorati/strapi-provider-upload-minio
# or
yarn add @avorati/strapi-provider-upload-minio
```

## ⚙️ Configuration

### 1. Configure the provider in Strapi

Create or edit the `config/plugins.ts` (or `.js`) file:

```typescript
export default {
  upload: {
    config: {
      provider: 'strapi-provider-upload-minio',
      providerOptions: {
        endPoint: process.env.MINIO_ENDPOINT || 'localhost',
        port: parseInt(process.env.MINIO_PORT || '9000'),
        useSSL: process.env.MINIO_USE_SSL === 'true',
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
MINIO_ENDPOINT=localhost
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

| Option      | Type   | Required | Description                                 |
|-------------|--------|----------|---------------------------------------------|
| `endPoint`  | string | ✅       | MinIO server endpoint                       |
| `port`      | number | ❌       | Server port (default: 9000 for HTTP, 443 for HTTPS) |
| `useSSL`    | boolean| ❌       | Use HTTPS (default: false)                  |
| `accessKey` | string | ✅       | MinIO access key                            |
| `secretKey` | string | ✅       | MinIO secret key                            |
| `bucket`    | string | ✅       | Bucket name to store files                  |
| `folder`    | string | ❌       | Folder inside the bucket (optional)         |
| `private`   | boolean| ❌       | Enable private file uploads (default: false) |
| `expiry`    | number | ❌       | Signed URL expiry in seconds (default: 604800 = 7 days) |

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
      MINIO_ENDPOINT: minio
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