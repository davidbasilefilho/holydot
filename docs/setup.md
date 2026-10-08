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

Gravações do holydot usam um lock exclusivo `<arquivo>.lock` durante leitura, comparação, backup e substituição. Outro processo de setup que tenta salvar nesse período recebe um erro e deve recarregar antes de tentar novamente; não há espera nem sobrescrita por outro writer cooperante. O lock é liberado em sucesso, cancelamento da operação ou falha tratada. Após encerramento abrupto pode restar um lock: confira que nenhum processo está gravando, preserve os arquivos e remova apenas o lock obsoleto antes de repetir. O programa não remove locks existentes automaticamente.

Editores externos e writers que ignoram esse protocolo não ficam bloqueados. As comparações detectam alterações observáveis, mas comparação e rename não são CAS atômico do filesystem; uma edição externa depois da comparação final ainda pode competir. Evite editar o mesmo arquivo externamente durante Save. O backup guarda os bytes originalmente carregados, não uma garantia de todas as revisões externas concorrentes.

Configurações v1 são lidas sem modificação. O antigo `delegation.model/effort` migra para especialistas; a coordenação recebe seu próprio padrão. Velocidade e intervalo são preservados. O escopo antigo de regras de conta sai das preferências gerais, mas permanece no backup original. O editor informa a migração, que ocorre apenas em Save. Cancel e render não migram o arquivo em disco.

## Aplicação no host

Forneça o render completo ao dot no fluxo autorizado de adoção. Nome holydot deve ser aplicado e verificado pelos controles reais do host; avatar, mascote e cor permanecem intactos. A CLI gera texto e configurações locais, sem modificar diretamente perfil, regras de conta, permissões ou agendamentos. Uma chamada aceita não comprova aplicação ou exibição.

O render inclui o fluxo de checkpoints com commit/push e verificação do SHA remoto em branch autorizada. A instalação/renderização não salva regras de conta nem recria regras excluídas. A autoridade vem das permissões e regras vigentes nos controles reais do host; se for necessária uma aprovação de push, use o controle suportado.

## **Inventário e estados da adoção**

| Etapa                  | Inventário e ação                                                                          | Evidência e retomada                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Configuração local     | Ler v1/v2, editar papéis, velocidade, intervalo e CODEX_HOME; Save/Cancel                  | Arquivo e backup; cancelamento preserva bytes; Save idêntico não duplica backup; erro preserva estado e permite nova tentativa. |
| Render                 | Gerar instruções integrais e preferências, com UTF-8                                       | Saída completa, bloco literal e config intacta; não aplica conta.                                                               |
| Nome do dot            | Descobrir leitura/rename nativos; ler perfil antes de mudar para holydot                   | Nome já correto só exige leitura; após rename, readback do nome e aparência. Falha/divergência permanece pendente.              |
| Regra opcional         | Somente mediante solicitação válida; preparar ação, destino, escopo, dados e comportamento | Proposta concreta não é regra salva nem permissão. Não criar regra por toda aprovação de tarefa.                                |
| Formulário obrigatório | Abrir pelo controle suportado, sem pergunta redundante de chat antes                       | Pendente, cancelado ou bloqueado não é salvo; uma chamada aceita não comprova formulário visível.                               |
| Regra salva            | Confirmar resultado do host e reler regra correspondente                                   | Só afirmar verificada se readback corresponder. Salva com leitura indisponível permanece não verificada.                        |
| Retomada               | Ler config, perfil, regras e eventual formulário atual antes de repetir                    | Concluir apenas etapas ainda autorizadas; preservar cancelamento, negativa e regra excluída. Não duplicar regra existente.      |

O render descreve os controles nativos de adoção. A CLI portátil não dispõe de credenciais nem API de conta e não grava o nome ou regras. Quando houver controle nativo autorizado, o dot receptor executa e verifica o fluxo; quando não houver, reporte a etapa bloqueada e o caminho suportado. Não finja integração real a partir de um teste de texto ou mock.

Para regras solicitadas, o formulário real é o ponto de confirmação. Sem controle nativo, Settings > Personalization > Custom rules é a alternativa documentada, quando disponível no workspace. Nenhum teste deste pacote altera conta, perfil ou regras pessoais. Regras excluídas só podem ser propostas novamente após nova solicitação válida; instalação/render nunca as restaura.

Os três pilares são capítulos sem hierarquia: I. autonomia; II. eficiência; III. qualidade e mergeability. O setup mantém os padrões aceitos e os modelos configuráveis; a reescrita não muda capacidades, preferências ou permissões reais.

Na reconciliação de regras, compare ação, destino, escopo e comportamento; preserve regras existentes e opções alheias ao pedido. Não reabra proposta pendente ou cancelada automaticamente: consulte o formulário existente quando válido; cancelamento exige nova solicitação para reabrir. Um controle ausente bloqueia somente sua etapa, sem impedir configuração local, render ou trabalho independente autorizado.

## Fonte verificada e nova instância

Antes da TUI e de qualquer Save, `holydot setup` lê a fonte completa instalada e verifica `instructions/integrity.json`. Uma fonte ausente, inválida, alterada ou incompatível bloqueia a operação sem salvar preferências. A confirmação local identifica versão instalada, revisão e digests reais; isso não confirma instruções ativas no host.

Após Save, entregue o resultado completo de `holydot render` pelo fluxo de adoção suportado do dot. Para recuperar o material, use `holydot resume`, que verifica e emite novamente a mesma fonte com as escolhas atuais. Não há hook automático de conversa/compactação nem escrita de regras de conta. A instância deve confirmar acesso real à fonte completa, aplicar a precedência e as correções atuais, e recuperar contexto quando faltar. Checklist interno e handoff reduzem omissões; conformidade comportamental permanece dependente do modelo/host e precisa de avaliação observada própria.

Quando o pedido incluir regras e tarefa programada, a adoção no host deve executar essas etapas após recuperar suas definições atuais, com deduplicação, formulário obrigatório de regras, confirmação de gravação/readback e estado parcial honesto. Não há criação automática de regras ou automations pela CLI. Definições insuficientes ou controles ausentes são bloqueios reais; a preferência de intervalo por si só não inventa schedule/horário/timezone/destino.
