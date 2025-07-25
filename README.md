# Strapi Provider Upload MinIO

[![npm version](https://img.shields.io/npm/v/@avorati/strapi-provider-upload-minio.svg)](https://www.npmjs.com/package/@avorati/strapi-provider-upload-minio)
[![npm downloads](https://img.shields.io/npm/dm/@avorati/strapi-provider-upload-minio.svg)](https://www.npmjs.com/package/@avorati/strapi-provider-upload-minio)

Provider de upload para Strapi v5 que permite armazenar arquivos no MinIO (S3-compatible storage).

## ✨ Características

- ✅ Compatível com Strapi v5
- ✅ Suporte completo ao MinIO
- ✅ Upload de arquivos públicos e privados
- ✅ URLs assinadas para arquivos privados
- ✅ Configuração de bucket automática
- ✅ Metadados personalizados
- ✅ TypeScript support
- ✅ Streaming de arquivos grandes

## 📦 Instalação

```bash
npm install @avorati/strapi-provider-upload-minio
# ou
yarn add @avorati/strapi-provider-upload-minio
```

## ⚙️ Configuração

### 1. Configurar o provider no Strapi

Crie ou edite o arquivo `config/plugins.ts` (ou `.js`):

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
        region: process.env.MINIO_REGION || 'us-east-1',
        folder: process.env.MINIO_FOLDER || '', // opcional
        baseUrl: process.env.MINIO_BASE_URL, // opcional, auto-gerado se não fornecido
      },
    },
  },
};
```

### 2. Variáveis de ambiente

Adicione as seguintes variáveis ao seu arquivo `.env`:

```env
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=strapi-uploads
MINIO_REGION=us-east-1
MINIO_FOLDER=uploads
MINIO_BASE_URL=http://localhost:9000
```

## 🚀 Uso

### Upload básico

O provider funciona automaticamente com o sistema de upload do Strapi. Você pode fazer upload de arquivos através da API ou do painel administrativo.

### URLs assinadas para arquivos privados

```typescript
// Gerar URL assinada válida por 1 hora
const signedUrl = await strapi.plugin('upload').provider.getSignedUrl(file, { 
  expiresIn: 3600 
});
```

### Upload programático

```typescript
const file = {
  name: 'example.jpg',
  hash: 'example_hash',
  ext: '.jpg',
  mime: 'image/jpeg',
  size: 12345,
  buffer: fileBuffer, // ou stream: fileStream
};

await strapi.plugin('upload').provider.upload(file, { 
  isPrivate: false 
});
```

## 🔧 Opções de configuração

| Opção | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `endPoint` | string | ✅ | Endpoint do servidor MinIO |
| `port` | number | ❌ | Porta do servidor (padrão: 9000 para HTTP, 443 para HTTPS) |
| `useSSL` | boolean | ❌ | Usar HTTPS (padrão: false) |
| `accessKey` | string | ✅ | Chave de acesso do MinIO |
| `secretKey` | string | ✅ | Chave secreta do MinIO |
| `bucket` | string | ✅ | Nome do bucket para armazenar arquivos |
| `region` | string | ❌ | Região do bucket (padrão: 'us-east-1') |
| `folder` | string | ❌ | Pasta dentro do bucket (opcional) |
| `baseUrl` | string | ❌ | URL base personalizada para arquivos públicos |

## 🐳 Docker Compose - MinIO para desenvolvimento

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

## 🔐 Segurança

### Arquivos privados

Por padrão, os arquivos são públicos. Para uploads privados:

```typescript
await strapi.plugin('upload').provider.upload(file, { 
  isPrivate: true 
});
```

Arquivos privados requerem URLs assinadas para acesso:

```typescript
const signedUrl = await strapi.plugin('upload').provider.getSignedUrl(file);
```

### Configuração de CORS

Configure CORS no MinIO para permitir acesso do frontend:

```bash
mc admin config set myminio api cors_allow_origin="*"
```

## 🧪 Desenvolvimento

```bash
# Clonar repositório
git clone https://github.com/avorati/strapi-provider-upload-minio.git
cd strapi-provider-upload-minio

# Instalar dependências
npm install

# Build
npm run build

# Desenvolvimento com watch
npm run dev

# Testes
npm test
```

## 📄 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

## 🤝 Contribuição

Contribuições são bem-vindas! Por favor:

1. Fork o repositório
2. Crie uma branch para sua feature (`git checkout -b feature/amazing-feature`)
3. Commit suas mudanças (`git commit -m 'Add some amazing feature'`)
4. Push para a branch (`git push origin feature/amazing-feature`)
5. Abra um Pull Request

## 📞 Suporte

- 🐛 [Issues](https://github.com/avorati/strapi-provider-upload-minio/issues)
- 💬 [Discussions](https://github.com/avorati/strapi-provider-upload-minio/discussions)
- 📧 Email: seu.email@example.com

## 🙏 Agradecimentos

- [Strapi](https://strapi.io/) - Framework headless CMS
- [MinIO](https://min.io/) - High-performance object storage