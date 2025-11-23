# Scripts de Teste de Integração

## Teste de Integração com MinIO Real

Este script testa o provider MinIO contra uma instância real do MinIO.

### Pré-requisitos

1. MinIO rodando e acessível
2. Arquivo `.env` ou `.env.local` configurado (veja `.env.example`)

### Variáveis de Ambiente

O script carrega automaticamente as variáveis do arquivo `.env` ou `.env.local`. 
Crie um desses arquivos com as seguintes variáveis:

```bash
MINIO_ENDPOINT=localhost        # ou MINIO_HOST
MINIO_PORT=9000
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=Q3AM3UQ867SPQQA43P2F
MINIO_SECRET_KEY=zuf+tfteSlswRu7BJ86wekitnifILbZam1KYY3TG
MINIO_BUCKET=strapi-boiler
MINIO_FOLDER=cms
MINIO_PRIVATE=false             # ou true para testar modo privado
MINIO_EXPIRY=604800
```

### Executar Testes

```bash
# O script carrega automaticamente o .env ou .env.local
yarn test:integration

# Ou você pode sobrescrever variáveis inline (PowerShell)
$env:MINIO_ACCESS_KEY="xxx"; $env:MINIO_SECRET_KEY="yyy"; yarn test:integration

# Ou no bash/Linux
MINIO_ACCESS_KEY=xxx MINIO_SECRET_KEY=yyy yarn test:integration
```

### O que é testado

1. ✅ Upload de arquivo público
2. ✅ Geração de signed URL para arquivo público
3. ✅ Signed URL com expiry customizado
4. ✅ Verificação de isPrivate()
5. ✅ Delete de arquivo público
6. ✅ Upload de arquivo privado
7. ✅ Geração de signed URL para arquivo privado
8. ✅ Signed URL com expiry customizado para arquivo privado
9. ✅ Delete de arquivo privado

O script cria o bucket automaticamente se ele não existir.

