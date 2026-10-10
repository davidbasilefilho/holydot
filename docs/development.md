# Desenvolvimento

Use Bun 1.4 e ferramentas de `mise.toml`. Os scripts de package.json chamam mise tasks, mantendo local e CI no mesmo fluxo. Instale dependências do lockfile sem scripts de instalação de terceiros:

```sh
bun install --frozen-lockfile --ignore-scripts
bun run check
bun run hooks:install
```

`check` executa Oxfmt/JSDoc, Oxlint declarativo type-aware/type-check com oxlint-tsgolint, Bun tests, integridade do pacote, gate arquitetural e build installável. Lefthook repete lint e formatação no commit. Não altere configurações de conta ou instale monitores de CI.

## Effect e fronteiras

Configurações, flags, migração, render, versões e planejamento de release retornam Effect com erros tipados. Effect Schema valida dados de runtime antes de efeitos. `scripts/adapters/` concentra APIs nativas e bibliotecas externas: filesystem, OpenTUI, parser OXC e operações de publicação. Async/Promises e try/catch nativos são permitidos nessas fronteiras; não devem se espalhar pelo domínio. Os pontos de entrada executam um único programa Effect e traduzem o resultado para stdout/stderr.

O gate usa AST para rejeitar async, await, new Promise, throw e try/catch nativos no domínio, preservando adaptadores legítimos e a execução no ponto de entrada. Também exige JSDoc de símbolos exportados e membros de interfaces expostas. Funções, tipos, interfaces, classes, constantes e membros públicos devem explicar comportamento e falhas pertinentes; não duplique tipos TypeScript em tags.

## Dependências

O gate de documentação faz inspeção estática do AST e resolve apenas declarações do mesmo módulo. A resolução compartilhada segue aliases, wrappers TypeScript, propriedades com chave literal e valores conhecidos de object/array destructuring (renomeação, nesting, defaults conhecidos, holes e rest). Consultas públicas `typeof` usam esses mesmos valores; acessos qualificados ou índices literais selecionam a parte exposta. Assinaturas alcançadas alimentam o fechamento de tipos locais e herança, com deduplicação e proteção contra ciclos. Anotações literais de objetos/tuplas também podem ser projetadas para a binding selecionada.

A matriz de testes cruza essas formas com export direto, alias, default, assinatura `typeof`, campo público de classe e membro de objeto. Casos positivos preservam irmãos não exportados, membros privados, escopos que sombreiam nomes e imports externos. Isso não substitui o typecheck: não executa inicializadores, segue imports, avalia chamadas, infere retornos de corpos, calcula chaves dinâmicas nem acompanha mutações posteriores. Valores ou projeções cuja forma não é conhecida por essas regras ficam fora da resolução; o lint/typecheck separado continua necessário.

As dependências diretas usam caret e bun.lock reproduzível. OpenTUI/Solid é a base da TUI; tuiparts não é necessário para este editor. A faixa de Solid começa com caret e tem limite `<1.9.13`, pois 1.9.12 é o peer exato de OpenTUI 0.5.16. O limite mantém uma única implementação reativa também na instalação do consumidor, sem override incompatível com npm pack. Atualize o par somente após verificar compatibilidade. TypeScript 7 é a ferramenta de linguagem; OXC fornece o parser de AST, sem depender da antiga API JavaScript do compilador TypeScript.

## Pacote instalável

`bun run build` produz JavaScript em dist/ com o plugin oficial Solid e chunks separados. A ordem de carga mantém o preload concluído antes de importar consumidores Solid. Isso evita depender do bunfig.toml ou da transformação de TSX dentro de node_modules no computador receptor. `prepack` chama o build via mise; o adaptador de release também constrói explicitamente antes de npm pack --ignore-scripts.

## Verificação real

Além dos testes de domínio, execute setup inicial, edição, cancelamento, erros, migração, mouse/teclado, resize, render redirecionado e pacote instalado em ambiente limpo. Guarde evidências de terminal fora dos arquivos distribuídos. Linux e Windows têm gates separados em validation.yml; um teste local Linux não comprova resultado Windows.

## Checkpoints

Faça commits e pushes dos checkpoints autorizados e confirme o SHA remoto. Branches `codex/**`, `work/**`, `feature/**` e camadas de stack `release/v<versão>/<mudança>` não acionam publish.yml. Branches `main`, branches legadas de um nível `release/*` (por exemplo, `release/v0.1.0`) e tags `v*` podem publicar e exigem autorização de publicação antes de push. Nunca coloque handoffs privados, credenciais ou estado pessoal no pacote.

Os bumps de X/Y/Z estão em [versões e publicação](releases.md); não são comandos públicos da CLI.

Cada binding/declarator exportado precisa de JSDoc próprio. O comentário anterior à declaração cobre apenas sua primeira binding; comentários inline podem documentar as demais, inclusive destructuring, renomeação e rest. Exportar somente uma binding não expõe as outras do mesmo statement.
