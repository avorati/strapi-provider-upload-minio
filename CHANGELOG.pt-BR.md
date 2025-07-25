# Changelog

Todas as mudanças importantes do projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planejado
- Suporte para múltiplas regiões
- Cache de metadados
- Compressão automática de imagens
- Integração com CDN

## [1.0.0] - 2025-01-XX

### Added
- Provider MinIO para Strapi v5
- Upload de arquivos públicos e privados
- Geração de URLs assinadas
- Criação automática de buckets
- Suporte a streaming de arquivos grandes
- Configuração de metadados personalizados
- Suporte completo ao TypeScript
- Testes unitários e de integração
- Documentação completa
- CI/CD pipeline
- Configuração automática de políticas de bucket

### Security
- Validação de configuração obrigatória
- Sanitização de nomes de arquivos
- Controle de acesso baseado em políticas

## [0.1.0-beta.3] - 2025-01-XX

### Added
- Implementação básica do provider
- Testes iniciais
- Documentação preliminar

### Changed
- Melhorias na interface de configuração
- Otimização do processo de upload

### Fixed
- Correções em edge cases de upload
- Melhoria no tratamento de erros

## [0.1.0-beta.2] - 2025-01-XX

### Added
- Suporte inicial para Strapi v5
- Configuração básica do MinIO

### Fixed
- Problemas de compatibilidade com Node.js 18+
- Questões de tipagem TypeScript

## [0.1.0-beta.1] - 2025-01-XX

### Added
- Versão inicial do provider
- Funcionalidades básicas de upload e delete
- Estrutura inicial do projeto 