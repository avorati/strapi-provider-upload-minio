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

## 📜 Código de Conduta

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

## 🛠 Configuração do Ambiente

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

Seguimos [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Exemplos
feat: add support for custom metadata
fix: resolve bucket creation error
docs: update installation guide
refactor: improve error handling
test: add upload integration tests
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

Usamos [Semantic Versioning](https://semver.org/):

- **PATCH** (1.0.1): Bug fixes
- **MINOR** (1.1.0): Novas funcionalidades (compatível)
- **MAJOR** (2.0.0): Mudanças breaking

## 🚀 Process de Release

1. Mudanças são mergeadas na `main`
2. CI executa testes e build
3. Semantic Release automaticamente:
   - Analisa commits
   - Gera CHANGELOG
   - Cria tag/release
   - Publica no npm

## 📚 Recursos Úteis

- [Strapi Documentation](https://docs.strapi.io/)
- [MinIO JavaScript SDK](https://docs.min.io/docs/javascript-client-api-reference.html)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)

## ❓ Dúvidas?

- Abra uma [Discussion](https://github.com/seu-usuario/strapi-provider-upload-minio/discussions)
- Entre em contato: seu.email@example.com

Obrigado pela contribuição! 🙏