# Políticas e evidências

| Propriedade                                       | Implementação                                | Evidência apropriada                                                               |
| ------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------- |
| Setup editável, Save/Cancel e migração com backup | scripts/setup.ts, adaptadores filesystem/TUI | tests/setup.test.ts, tests/cli.test.ts e execução de terminal                      |
| OpenTUI + Solid, foco, opções e resize            | scripts/ui/setup-editor.tsx                  | tests/ui.test.tsx e inspeção da TUI real                                           |
| Flags, config e erros com Effect Schema           | scripts/flags.ts, scripts/config.ts          | testes positivos/negativos de runtime                                              |
| Papéis distintos, Standard/Fast e intervalo       | config e render                              | testes de escolhas salvas e render completo                                        |
| UTF-8 fonte, terminal e redirecionamento          | leitura estrita e saída UTF-8                | gate arquitetural e arquivo render real                                            |
| Autonomia e perguntas em lotes                    | instructions/holydot.md                      | texto completo render e aceitação no host                                          |
| Efeitos nas fronteiras legítimas                  | scripts/adapters/                            | AST gate com testes de rejeição/permissão                                          |
| JSDoc público e lint/typecheck                    | OXC declarativo e gate AST                   | bun run check                                                                      |
| Versões X/Y/Z e canais deliberate                 | scripts/version.ts, scripts/release.ts       | tests/version.test.ts, tests/release.test.ts                                       |
| Checkpoint remoto sem publicação                  | publish.yml e planner de release             | filtros YAML, testes e SHA remoto                                                  |
| Planejamento fundamentado e lotes completos       | instructions/holydot.md, templates/task.md   | contexto/pesquisa antes do plano; testes de render e alinhamento                   |
| PR normal com confiança e head verificado         | instructions/holydot.md, templates/result.md | testes/CI do SHA, leitura real de estado/head do PR                                |
| Continuidade da autorização e manutenção do PR    | instructions/holydot.md e contratos          | testes de casos positivos/negativos no render; autoridade e aceitação real do host |
| Integridade e atribuição                          | validate.ts, NOTICE e LICENSE                | tests/validate.test.ts                                                             |

Testes locais não comprovam seletores do host, alteração de perfil, autenticação, OIDC, agendamentos, disponibilidade dos modelos ou comportamento de um dot. Uma chamada aceita não comprova exibição. Relate aprovação, falha, bloqueio e não execução separadamente para a versão efetivamente avaliada.

Os pilares I. autonomia, II. eficiência e III. qualidade e mergeability são capítulos sem hierarquia. [Prompt design](prompt-design.md) documenta as fontes públicas; [setup](setup.md) distingue gates locais de adoção real no host.

Prioridade de execução e recuperação de interrupções: [fonte canônica](../instructions/holydot.md), tests/orchestration-policy.test.ts e [cenários operacionais](operational-acceptance.md). Os testes cobrem distribuição, preservação do literal e configurações; decisões reais de escalada, intenção de parada e efeitos remotos exigem evidência do host.
