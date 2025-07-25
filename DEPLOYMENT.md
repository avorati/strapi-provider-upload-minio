# 🚀 Guia de Deployment

Este guia contém instruções para publicar o provider MinIO no marketplace do Strapi e no npm.

## 📦 Preparação para Publicação

### 1. Verificações Pré-Publicação

```bash
# Verificar se todos os testes passam
npm test

# Verificar linting
npm run lint

# Build do projeto
npm run build

# Verificar estrutura do pacote
npm pack --dry-run
```

### 2. Configuração do package.json

Certifique-se que as informações estão corretas:

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

## 📋 Checklist de Qualidade

- [ ] **Documentação completa**: README detalhado com exemplos
- [ ] **Testes abrangentes**: Cobertura > 80%
- [ ] **TypeScript**: Tipos completos e exportados
- [ ] **Configuração**: Validação de parâmetros obrigatórios
- [ ] **Tratamento de erros**: Mensagens claras e úteis
- [ ] **Performance**: Otimizado para arquivos grandes
- [ ] **Segurança**: Validações de entrada e saída
- [ ] **Compatibilidade**: Testado com diferentes versões do Node.js

## 🌐 Publicação no NPM

### 1. Configurar NPM Account

```bash
# Login no npm
npm login

# Verificar usuário logado
npm whoami
```

### 2. Configurar Scoped Package

```bash
# Para organizações
npm config set @strapi-community:registry https://registry.npmjs.org/
```

### 3. Publicar

```bash
# Primeira publicação
npm publish --access public

# Para atualizações (usando semantic-release)
git commit -m "feat: add new feature"
git push origin main
```

## 📱 Submetendo ao Strapi Market

### 1. Preparar Submission

O Strapi Market requer alguns arquivos específicos:

```bash
# Estrutura necessária
├── README.md          # Documentação completa
├── package.json       # Configuração com "strapi" field
├── CHANGELOG.md       # Histórico de versões
├── assets/
│   ├── logo.png       # Logo 512x512px
│   ├── screenshot1.png
│   └── screenshot2.png
```

### 2. Logo e Screenshots

- **Logo**: 512x512px, fundo transparente, formato PNG
- **Screenshots**: Demonstrando configuração e uso
- **Banner** (opcional): 1200x400px para destaque

### 3. Metadados para Market

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

### 4. Submeter ao Market

1. Acesse [Strapi Market](https://market.strapi.io/submit-plugin)
2. Preencha o formulário de submissão
3. Forneça:
   - URL do repositório GitHub
   - URL do package no npm
   - Descrição detalhada
   - Screenshots/demos
   - Informações de contato

### 5. Critérios de Aprovação

- **Funcionalidade**: Provider funciona conforme documentado
- **Qualidade**: Código limpo, bem testado
- **Documentação**: README claro e completo
- **Compatibilidade**: Funciona com Strapi v5
- **Manutenção**: Resposta a issues em tempo hábil

## 🔄 Processo de Release Automático

### 1. Configurar Semantic Release

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

### 2. Configurar GitHub Secrets

No repositório GitHub, adicionar secrets:
- `NPM_TOKEN`: Token do npm para publicação
- `GITHUB_TOKEN`: Já disponível automaticamente

### 3. Conventional Commits

```bash
# Patch release (1.0.1)
git commit -m "fix: resolve upload timeout issue"

# Minor release (1.1.0)
git commit -m "feat: add support for custom metadata"

# Major release (2.0.0)
git commit -m "feat!: change configuration structure"
```

## 📊 Monitoramento Pós-Publicação

### 1. Métricas NPM

- Downloads mensais
- Versões mais usadas
- Dependents

### 2. GitHub Analytics

- Stars e forks
- Issues abertas/fechadas
- Pull requests
- Community health

### 3. Strapi Market

- Views e downloads
- Reviews dos usuários
- Rating

## 🛠 Manutenção Contínua

### 1. Atualizações Regulares

- Compatibilidade com novas versões do Strapi
- Atualizações de segurança
- Melhorias de performance

### 2. Suporte à Comunidade

- Resposta a issues em 48h
- Review de pull requests
- Documentação atualizada

### 3. Roadmap

- Novas funcionalidades baseadas em feedback
- Melhorias sugeridas pela comunidade
- Integração com outras ferramentas

## 📋 Templates Úteis

### Issue Template

```markdown
---
name: Bug Report
about: Criar relatório de bug
title: ''
labels: 'bug'
assignees: ''
---

**Descrição do Bug**
Descrição clara do problema.

**Reproduzir**
Passos para reproduzir:
1. ...
2. ...

**Comportamento Esperado**
O que deveria acontecer.

**Ambiente:**
- Node.js: [versão]
- Strapi: [versão]
- Provider: [versão]
- MinIO: [versão]
```

### PR Template

```markdown
## 📝 Descrição
Breve descrição das mudanças.

## 🔗 Issues Relacionadas
Fixes #123

## 🧪 Testes
- [ ] Testes adicionados/atualizados
- [ ] Todos os testes passando

## 📋 Checklist
- [ ] Código revisado
- [ ] Documentação atualizada
- [ ] CHANGELOG atualizado
```

## 🎯 Próximos Passos

1. **Publicar versão inicial** no npm
2. **Submeter ao Strapi Market**
3. **Divulgar na comunidade** (Discord, Forums)
4. **Coletar feedback** dos primeiros usuários
5. **Iterar e melhorar** baseado no feedback

---

**Sucesso! 🎉** Seu provider está pronto para ser usado pela comunidade Strapi!