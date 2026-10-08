# Versões e publicação

Versão-base: 0.1.0. Convenção do produto: `0.X.Y-Z`, com manutenção `-Z` opcional. Scripts de desenvolvimento Bun/mise:

```sh
bun run bump:x
bun run bump:y
bun run bump:z
```

X incrementa o segundo campo e reinicia Y e manutenção: `0.1.2-3 → 0.2.0`. Y incrementa o terceiro e reinicia manutenção: `0.1.2-3 → 0.1.3`. Z incrementa a manutenção: `0.1.2-3 → 0.1.2-4`; quando ausente, começa em 1: `0.1.0 → 0.1.0-1`. Os scripts editam somente package.json com backup. Não fazem commit, push, tag ou publicação.

## Canais deliberados

| Canal          | Versão npm                                 | dist-tag npm | GitHub     |
| -------------- | ------------------------------------------ | ------------ | ---------- |
| Dev            | `BASE-dev-SHORTSHA`                        | `dev`        | prerelease |
| Produto stable | `BASE`, inclusive manutenção numérica `-Z` | `latest`     | release    |

`-Z` tem sintaxe de prerelease em SemVer. O produto usa esse sufixo para manutenção e escolhe `latest` explicitamente. Consumidores devem usar a versão exata ou a dist-tag desejada; uma faixa SemVer comum pode excluir manutenção com sufixo. O canal dev conserva toda a base (`0.1.2-3-dev-SHORTSHA`) e não é consumido recursivamente por tags dev.

## Workflows

Um único `publish.yml` publica dev/stable e chama `validation.yml` antes das operações externas. Mise-action instala ferramentas; release usa npm 11.21.0 com trusted publishing e `id-token: write`, sem NPM_TOKEN.

- Push autorizado em `main` ou `release/**`: dev.
- Push autorizado da tag exatamente `v{package.version}`: produto stable.
- Checkpoints em `codex/**`, `work/**` ou `feature/**`: apenas validation.yml, nunca publicação.

A fonte deve estar limpa e no SHA exato do evento. O planner rejeita branches de checkpoint também no código. Pacote npm existente precisa ter a mesma integridade; conflitos não são sobrescritos. Uma operação interrompida preserva draft verificável no GitHub; atrasos de visibilidade só repetem leituras, nunca npm publish. Uma repetição idêntica não retrocede dist-tags.

## Proteção dos canais em reruns

Antes de criar tags/draft e novamente imediatamente antes de `npm publish --tag`, o adapter lê a dist-tag selecionada no packument do [registry npm](https://github.com/npm/registry/blob/main/docs/REGISTRY-API.md). `dev` e `latest` são independentes. A ordem do produto compara X, Y e Z numéricos, com Z ausente como zero; não usa a precedência SemVer do sufixo de manutenção. Em dev com a mesma base, compara o commit estampado no pacote atual com o candidato pelo endpoint read-only do [GitHub](https://docs.github.com/en/rest/commits/commits#compare-two-commits); hashes não são ordenados alfabeticamente.

Se o canal já aponta para versão/base/commit mais novo, o run antigo é ignorado: um artefato histórico ainda ausente não é publicado nem move a dist-tag. O primeiro check também evita criar tag/draft nesse caso. Se o canal avançar durante a preparação, o segundo check preserva o draft existente e ignora o publish. Integridade conflitante, metadados inválidos, origem dev não verificável, bases de mesma ordem com representações diferentes ou commits divergentes bloqueiam a operação. Não há fallback que escolha arbitrariamente um vencedor.

A proteção vale para revisões do workflow que contêm esses guards; ela não altera retrospectivamente código de commits antigos. A fila compartilhada de `publish.yml` continua serializando as duas modalidades. Os checks de canal não são compare-and-swap do npm e não impedem um escritor externo que altere a dist-tag depois da última leitura; a garantia entre runs deste workflow depende dessa serialização. Testes do adapter interceptam toda rede e `npm publish` em processos descartáveis, usando estado fictício: não são publicação real, alteração de tags de produção ou evidência de OIDC.

## Aprovação e autenticação

Preparar ou validar o candidato não autoriza publicação. Push nas branches de release, tags, merge, rerun de publicação e npm publish exigem autorização correspondente, que pode já ter sido concedida ao mesmo fluxo e escopo. Recupere essa evidência antes de pedir novamente. Com merge e dev já autorizados e publicação automática conhecida, adiar apenas estável não revoga dev nem exige reconfirmação; tag estável e latest continuam vedados até ordem própria. Mudança material ou controle obrigatório do host exige avaliação correspondente; não altere credenciais/OIDC por presumir que a autorização de publicação cobre configuração de conta. Não repita o bootstrap já publicado para resolver atraso de visibilidade.

O publisher esperado no npm aponta para GitHub Actions, `davidbasilefilho/holydot`, `publish.yml`; environment deve corresponder ao workflow (atualmente nenhum). É necessário permitir publicação direta pelo publisher. Não afirme que o formulário foi salvo ou que OIDC funciona sem evidência real. A CLI não altera essa conta.

Depois de publicação autorizada, verifique versão/dist-tag e integridade no npm, tag/SHA e release GitHub, então entregue comandos bunx com versão realmente disponível.

## Fila de publicação

A concorrência de publicação usa um grupo compartilhado, `queue: max` e `cancel-in-progress: false`, conforme a [documentação atual do GitHub.com](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency). O padrão `single` substitui um run pendente quando chega outro evento; `max` preserva até 100 pendentes, sem cancelar a execução ativa. A fila tem limite: novos runs acima de 100 pendentes são cancelados pelo serviço. A ordem segue a entrada na espera, não necessariamente a ordem dos eventos. Verifique runs cancelados e retome somente publicações realmente autorizadas. Não alegue fila ilimitada nem comportamento comprovado por uma publicação que não foi executada.
