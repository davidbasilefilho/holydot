# Desenvolvimento

O conteúdo para o dot é Markdown. Bun e as ferramentas abaixo servem para manter, validar e distribuir esse conteúdo; não executam um assistente.

## Preparar um checkout

Instale [mise](https://mise.jdx.dev/getting-started.html) e revise o `mise.toml` antes de executar suas tarefas:

```sh
mise install
mise exec -- bun install --frozen-lockfile
mise exec -- bun run check
mise exec -- bun run hooks:install
```

O projeto solicita Bun 1.4 e registra dependências exatas no `bun.lock`. `package.json` encaminha os scripts para tarefas do mise. Node 24 e npm são usados para publicação npm com os mecanismos de autenticação compatíveis; os testes e o validador usam Bun.

Os hooks são opt-in: `hooks:install` instala Lefthook no checkout atual. O pre-commit executa Oxlint e a verificação Oxfmt, sem formatar ou adicionar arquivos automaticamente. Isso evita alterar o conjunto de mudanças preparado por você.

## Comandos

| Script                 | Efeito                                                               |
| ---------------------- | -------------------------------------------------------------------- |
| `bun run format`       | Formata arquivos e comentários JSDoc com Oxfmt                       |
| `bun run format:check` | Verifica formatação sem escrever                                     |
| `bun run lint`         | Oxlint com análise de tipos, checagem de tipos e regras JSDoc        |
| `bun run typecheck`    | Executa a mesma configuração Oxlint com checagem de tipos habilitada |
| `bun run test`         | Executa `bun test`                                                   |
| `bun run validate`     | Verifica integridade do pacote offline                               |
| `bun run check`        | Formatação, lint com tipos, testes e integridade, em sequência       |

Execute dentro de `mise exec --` se as ferramentas não estiverem no seu PATH.

## Configuração declarativa e JSDoc

`.oxlintrc.json` habilita `options.typeAware` e `options.typeCheck`, com `oxlint-tsgolint` instalado. `.oxfmtrc.json` habilita `jsdoc`. As políticas ficam nos arquivos, sem flags de CLI para escolher regras ou opções de estilo. A flag operacional `--check` apenas escolhe verificação em vez de escrita.

Documente com JSDoc toda API pública, exposta ou exportada conforme [AGENTS.md](../AGENTS.md). As regras nativas escolhidas validam tags, parâmetros e retornos documentados; não representam cobertura completa de toda ausência possível de comentário. A revisão continua verificando esse requisito. Não se usa uma regra nativa `require-jsdoc` inexistente nesta configuração.

Referências oficiais: [tipos no Oxlint](https://oxc.rs/docs/guide/usage/linter/type-aware), [configuração Oxlint](https://oxc.rs/docs/guide/usage/linter/config), [JSDoc no Oxfmt](https://oxc.rs/docs/guide/usage/formatter/config-file-reference), [tarefas mise](https://mise.jdx.dev/tasks/toml-tasks.html) e [Lefthook](https://lefthook.dev/).

## O que os testes provam

O validador verifica arquivos essenciais, links Markdown inline locais, referências fixadas e marcadores da licença. Os testes exercitam casos válidos e inválidos, incluindo links fora do pacote. Ele não é um parser Markdown completo, não verifica links externos nem confirma conformidade jurídica, ausência de segredos ou comportamento de um modelo. A revisão humana de conteúdo e privacidade continua necessária.

## Distribuição

O pacote npm distribui documentação, instruções, modelos e exemplos. Não oferece comando `npx`, servidor, instalação de regras ou configuração automática do dot. Para contribuir, use o checkout GitHub com as ferramentas de desenvolvimento; a distribuição npm é voltada ao consumo do texto.

Os workflows deste repositório usam a action oficial do mise. `validation.yml` contém a verificação, incluindo `bun test`; `dev.yml` trata pushes de desenvolvimento e `stable.yml` tags estáveis `v*`. A publicação depende das permissões e da configuração do responsável no GitHub/npm. Não há monitoramento ou review bot para outros repositórios.

Consulte [publicação e recuperação](releases.md) para versões dev/stable, bootstrap do pacote npm e configuração de trusted publishers pelo responsável.
