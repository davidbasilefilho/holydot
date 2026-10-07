# Setup e render

Os comandos públicos de tarefa são `setup` e `render`. Use `-h/--help` e `-v/--version` também depois de um comando. A manutenção de versão pertence a scripts Bun/mise, não à CLI do produto.

Depois da publicação da versão desejada:

```sh
bunx holydot@0.1.0 setup
bunx holydot@0.1.0 render > holydot.instructions.md
```

A existência deste candidato não confirma sua disponibilidade no npm. Não é necessária instalação global, `bun add` nem dependência no seu projeto.

## Editor interativo

O setup usa OpenTUI + Solid. Tab/Shift+Tab ou ↑↓ muda o foco; ←→ altera opções; texto é editável nos campos de modelo, minutos e caminho. Ctrl+S ou Save confirma; Esc, Ctrl+C ou Cancel abandona sem escrever. Mouse seleciona campos e aciona Save/Cancel. Terminais menores que 48 × 24 mostram orientação para redimensionar. O editor mantém as escolhas anteriores.

Flags opcionais pré-selecionam campos do editor; não salvam sem confirmação:

```sh
bunx holydot@0.1.0 setup --coordinator-model gpt-6.1-sol --coordinator-effort medium
bunx holydot@0.1.0 setup --specialist-model gpt-6-luna --specialist-effort high
bunx holydot@0.1.0 setup --status-interval-minutes 60 --speed fast
bunx holydot@0.1.0 setup --codex-home /caminho/avancado
bunx holydot@0.1.0 setup --codex-home default
```

`--config CAMINHO` escolhe outro arquivo em setup/render. Render lê configurações salvas e não aceita overrides de preferências.

## Preferências locais

```json
{
  "schemaVersion": 2,
  "delegation": {
    "coordinator": { "model": "gpt-6.1-sol", "effort": "medium" },
    "specialist": { "model": "gpt-6-luna", "effort": "high" },
    "speed": "standard"
  },
  "statusUpdates": { "intervalMinutes": 30 },
  "codexHome": null
}
```

Modelos são identificadores validados, não comprovação de disponibilidade. Standard é padrão; Fast exige opt-in. O intervalo aceita inteiros de 1 a 1440 minutos, mas não configura acompanhamento pessoal. Repositório, branch e permissões são contexto por tarefa. Autonomia não é um seletor rule-mode.

`codexHome: null` respeita CODEX_HOME explícito ou o padrão do Codex `~/.codex`. Um override local avançado serve como preferência para execução autorizada; a CLI não altera a variável do processo nem os arquivos do Codex. Se uma integração futura com HolyCodex estiver operacional, suas configurações devem ser a fonte de verdade, evitando seletores duplicados.

## Persistência e migração

Na edição, a gravação mantém uma cópia `.bak-…` com os bytes originais. Inicialização cria o arquivo de forma exclusiva e atômica; não sobrescreve uma criação concorrente. Falha de permissões, arquivo inválido, symlink, UTF-8 corrompido ou mudança detectada durante o editor aborta a parte afetada.

Configurações v1 são lidas sem modificação. O antigo `delegation.model/effort` migra para especialistas; a coordenação recebe seu próprio padrão. Velocidade e intervalo são preservados. O escopo antigo de regras de conta sai das preferências gerais, mas permanece no backup original. O editor informa a migração, que ocorre apenas em Save. Cancel e render não migram o arquivo em disco.

## Aplicação no host

Forneça o render completo ao dot no fluxo autorizado de adoção. Nome holydot deve ser aplicado e verificado pelos controles reais do host; avatar, mascote e cor permanecem intactos. A CLI gera texto e configurações locais, sem modificar diretamente perfil, regras de conta, permissões ou agendamentos. Uma chamada aceita não comprova aplicação ou exibição.
