# Guia de Contribuição

Obrigado por seu interesse em contribuir com o Strapi MinIO Provider! 🎉

## 📋 Sumário

- [Código de Conduta](#código-de-conduta)
- [Como Contribuir](#como-contribuir)
- [Configuração do Ambiente](#configuração-do-ambiente)
- [Executando Testes](#executando-testes)
- [Enviando Pull Requests](#enviando-pull-requests)
- [Convenções de Código](#convenções-de-código)
- [Versionamento](#versionamento)

## 📝 Código de Conduta

Este projeto segue o [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/). Ao participar, você se compromete a seguir este código.

## 🤝 Como Contribuir

### Reportando Bugs

1. Verifique se o bug já foi reportado nas [Issues](https://github.com/seu-usuario/strapi-provider-upload-minio/issues)
2. Se não encontrou, crie uma nova issue com:
   - Título claro e descritivo
   - Descrição detalhada do problema
   - Passos para reproduzir
   - Versões do Strapi, Node.js e MinIO
   - Screenshots/logs quando aplicável

### Sugerindo Melhorias

1. Abra uma issue descrevendo:
   - A funcionalidade desejada
   - Por que seria útil
   - Como deveria funcionar
   - Exemplos de uso

### Contribuindo com Código

1. Fork o repositório
2. Crie uma branch para sua feature (`git checkout -b feature/amazing-feature`)
3. Faça suas alterações
4. Execute os testes
5. Commit suas mudanças
6. Push para a branch
7. Abra um Pull Request

## 🛠️ Configuração do Ambiente

### Pré-requisitos

- Node.js 18+
- npm 6+
- Docker (para MinIO local)

### Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/strapi-provider-upload-minio.git
cd strapi-provider-upload-minio

# Instale dependências
npm install

# Configure MinIO local com Docker
docker run -d \
  -p 9000:9000 \
  -p 9001:9001 \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin" \
  minio/minio server /data --console-address ":9001"
```

### Configuração de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=test-bucket
```

## 🧪 Executando Testes

```bash
# Executar todos os testes
npm test

# Executar testes em modo watch
npm test -- --watch

# Executar testes com cobertura
npm test -- --coverage

# Linting
npm run lint

# Build
npm run build
```

## 📝 Enviando Pull Requests

### Antes de Enviar

- [ ] Todos os testes passando
- [ ] Código segue as convenções
- [ ] Documentação atualizada
- [ ] Commits seguem padrão conventional

### Template de PR

```markdown
## 📝 Descrição

Breve descrição das mudanças realizadas.

## 🔧 Tipo de Mudança

- [ ] Bug fix (mudança que corrige um problema)
- [ ] Nova funcionalidade (mudança que adiciona funcionalidade)
- [ ] Breaking change (mudança que quebra compatibilidade)
- [ ] Documentação (mudança apenas na documentação)

## ✅ Checklist

- [ ] Testes passando
- [ ] Linting sem erros
- [ ] Documentação atualizada
- [ ] CHANGELOG.md atualizado (se necessário)

## 🧪 Como Testar

Instruções para testar as mudanças...
```

## 📏 Convenções de Código

### TypeScript

- Use TypeScript para todo o código
- Defina tipos explícitos quando necessário
- Evite `any`, prefira tipos específicos

### Formatação

```bash
# Formatação automática
npm run format

# Verificar formatação
npm run format:check
```

### Nomenclatura

- **Variáveis/Funções**: camelCase (`fileName`, `uploadFile`)
- **Classes/Interfaces**: PascalCase (`MinIOProvider`, `StrapiFile`)
- **Constantes**: UPPER_SNAKE_CASE (`DEFAULT_REGION`)
- **Arquivos**: kebab-case (`minio-provider.ts`)

### Commits

Seguimos [Conventional Commits](https://www.conventionalcommits.org/) para gerar releases automáticas:

#### Tipos de Commit que Geram Release

**Major (X.0.0) - Breaking Changes:**
```bash
feat!: remove deprecated API
# ou
feat(api)!: remove deprecated endpoint

BREAKING CHANGE: API foi refatorada completamente
```

**Minor (0.X.0) - Novas Features:**
```bash
feat: add support for custom expiry in signed URLs
feat(provider): add support for custom metadata
```

**Patch (0.0.X) - Correções:**
```bash
fix: resolve bucket creation error
fix(url-builder): correct port handling for HTTPS
perf: optimize file upload streaming
refactor: improve error handling
```

#### Tipos que NÃO Geram Release

```bash
docs: update installation guide
style: fix code formatting
chore: update dependencies
test: add upload integration tests
build: update TypeScript configuration
ci: add semantic-release workflow
```

#### Formato do Commit

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Exemplos:**

```bash
# Feature (Minor Release)
feat: add support for custom expiry in signed URLs

Permite que usuários especifiquem tempo de expiração customizado
ao gerar URLs assinadas.

# Bug Fix (Patch Release)
fix(url-builder): corrige tratamento de porta para HTTPS

Corrigido problema onde porta 80 era incorretamente omitida
para conexões HTTPS.

# Breaking Change (Major Release)
feat!: refatora configuração do provider

BREAKING CHANGE: Opções de configuração foram reestruturadas.
A opção `region` foi removida. Use `endPoint` ao invés.

Guia de migração:
- Remova `region` da sua configuração
- Garanta que `endPoint` está configurado corretamente
```

### Estrutura de Arquivos

```
src/
├── __tests__/          # Testes
├── types/              # Definições de tipos
├── utils/              # Utilitários
├── index.ts            # Provider principal
└── constants.ts        # Constantes
```

## 📦 Versionamento

Usamos [Semantic Versioning](https://semver.org/) com releases automáticas:

- **PATCH** (1.0.1): Bug fixes, melhorias de performance, refatorações
- **MINOR** (1.1.0): Novas funcionalidades (compatível com versões anteriores)
- **MAJOR** (2.0.0): Mudanças breaking (quebra compatibilidade)

## 🚀 Processo de Release Automático

Quando você faz push de commits para `main`:

1. **CI executa testes e build**
2. **Semantic Release analisa seus commits** usando Conventional Commits
3. **Determina a próxima versão** baseado nos tipos de commit:
   - `feat:` → Minor (0.X.0)
   - `fix:`, `perf:`, `refactor:` → Patch (0.0.X)
   - `feat!:` ou `BREAKING CHANGE:` → Major (X.0.0)
4. **Atualiza automaticamente:**
   - `CHANGELOG.md` com as mudanças
   - `package.json` com a nova versão
5. **Cria tag Git** com a versão
6. **Publica no NPM** automaticamente
7. **Cria GitHub Release** com o changelog completo

### Pular CI

Para commits que não devem gerar release (ex: apenas documentação):

```bash
docs: atualiza README [skip ci]
```

## 📚 Recursos Úteis

- [Strapi Documentation](https://docs.strapi.io/)
- [MinIO JavaScript SDK](https://docs.min.io/docs/javascript-client-api-reference.html)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)

## ❓ Dúvidas?

- Abra uma [Discussion](https://github.com/seu-usuario/strapi-provider-upload-minio/discussions)
- Entre em contato: seu.email@example.com

Obrigado pela contribuição! 🙏 